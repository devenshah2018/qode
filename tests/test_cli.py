"""Behavioral regressions for the original interpreter failures and public CLI."""
import json
import pathlib
import subprocess
import sys
import unittest

EXE = str(pathlib.Path(sys.argv.pop(1)).resolve())
ROOT = pathlib.Path(__file__).resolve().parents[1]

def invoke(source, command='run', *options):
    return subprocess.run([EXE, command, '-', '--json', *options], input=source,
                          text=True, encoding="utf-8", capture_output=True, timeout=15)

def run(source):
    result = invoke(source)
    if result.returncode:
        raise AssertionError(result.stderr)
    return json.loads(result.stdout)

class CLI(unittest.TestCase):
    def test_hadamard_amplitudes_not_probabilities(self):
        a = run('qubit q; h q;')['amplitudes']
        self.assertAlmostEqual(a[0]['probability'], .5)
        self.assertAlmostEqual(a[1]['probability'], .5)

    def test_declarations_comments_state_preserved(self):
        result = run('[a comment with spaces]\nqubit a; qubit b; x a; x b;')
        self.assertEqual(result['amplitudes'][0]['basis'], '11')
        self.assertAlmostEqual(result['norm'], 1)

    def test_errors_are_nonzero_with_source_locations(self):
        for source in ['qubit q; wat q;', 'qubit q; h;', 'qubit q; h q', 'qubit q; x unknown;']:
            with self.subTest(source=source):
                r = invoke(source)
                self.assertNotEqual(r.returncode, 0)
                d = json.loads(r.stderr)
                self.assertGreater(d['line'], 0)
                self.assertGreater(d['column'], 0)

    def test_more_than_100_tokens(self):
        self.assertAlmostEqual(run('qubit q;' + 'h q;' * 10000)['amplitudes'][0]['probability'], 1, delta=1e-9)

    def test_string_spaces_escapes_and_inspection(self):
        r = run('print "Hello world\\nwith spaces"; inspect state;')
        self.assertEqual(r['observations'][0]['text'], 'Hello world\nwith spaces')
        self.assertEqual(r['observations'][1]['kind'], 'inspect')
        self.assertEqual(run('print \"Hello λ world\";')['observations'][0]['text'], 'Hello λ world')

    def test_seeded_sampling_and_entanglement(self):
        source = 'qubit a; qubit b; bit x; bit y; h a; cx a,b; measure a -> x; measure b -> y;'
        a = invoke(source, 'sample', '--shots', '10000', '--seed', '12')
        b = invoke(source, 'sample', '--shots', '10000', '--seed', '12')
        self.assertEqual(a.stdout, b.stdout)
        counts = json.loads(a.stdout)['counts']
        self.assertEqual(set(counts), {'00', '11'})
        self.assertLess(abs(counts['00'] - 5000), 250)

    def test_collapse_and_reset(self):
        r = run('qubit a; bit x; h a; measure a -> x; reset a;')
        self.assertAlmostEqual(r['amplitudes'][0]['probability'], 1)
        self.assertEqual(r['amplitudes'][0]['basis'], '0')

    def test_reduced_entangled_state_is_mixed(self):
        for q in run('qubit a; qubit b; h a; cx a,b;')['reduced']:
            self.assertAlmostEqual(q['purity'], .5)
            self.assertAlmostEqual(q['z'], 0)

    def test_halt(self):
        self.assertEqual(run('qubit a; halt; x a;')['amplitudes'][0]['basis'], '0')

    def test_examples(self):
        for example in (ROOT / 'examples').glob('*.qc'):
            with self.subTest(example=example.name):
                result = subprocess.run([EXE, 'run', str(example), '--json'], capture_output=True, text=True, encoding="utf-8", timeout=15)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertAlmostEqual(json.loads(result.stdout)['norm'], 1)

    def test_check_boundaries_and_invalid_utf8(self):
        self.assertEqual(invoke(''.join(f'qubit q{i};' for i in range(24)), 'check').returncode, 0)
        self.assertNotEqual(invoke(''.join(f'qubit q{i};' for i in range(25)), 'check').returncode, 0)
        self.assertEqual(invoke('qubit q;' + 'i q;' * 100000, 'check').returncode, 0)
        invalid = subprocess.run([EXE, 'check', '-'], input=b'print "\xff";', capture_output=True)
        self.assertNotEqual(invalid.returncode, 0)
        self.assertIn(b'UTF-8', invalid.stderr)
        text = subprocess.run([EXE, 'run', '-'], input='print "Hello world\\nλ";', text=True, encoding="utf-8", capture_output=True)
        self.assertEqual(text.stdout, 'Hello world\nλ\n')

    def test_limits(self):
        self.assertNotEqual(invoke(' ' * (1024 * 1024 + 1)).returncode, 0)
        self.assertNotEqual(invoke('qubit q;' + 'h q;' * 100001).returncode, 0)
        self.assertNotEqual(invoke('qubit q; bit b; measure q -> b;', 'sample', '--shots', '-1').returncode, 0)

if __name__ == '__main__':
    unittest.main()
