"""Independent dense-matrix and Qiskit oracles; never import Qode internals."""
import itertools
import json
import pathlib
import subprocess
import sys
import unittest
import numpy as np
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector

EXE = str(pathlib.Path(sys.argv.pop(1)).resolve())
NAMES = ['a', 'b', 'c', 'd', 'e', 'f']

def execute(body, n=3, seed=42):
    source = ''.join(f'qubit {q};' for q in NAMES[:n]) + body
    result = subprocess.run([EXE, 'run', '-', '--json', '--seed', str(seed)], input=source,
                            text=True, encoding="utf-8", capture_output=True, timeout=20)
    if result.returncode:
        raise AssertionError(result.stderr)
    data = json.loads(result.stdout)
    state = np.zeros(2**n, dtype=complex)
    for entry in data['amplitudes']:
        state[int(entry['basis'], 2)] = entry['re'] + 1j * entry['im']
    return state, data

def embed(matrix, target, n):
    factors = [matrix if q == target else np.eye(2) for q in reversed(range(n))]
    result = factors[0]
    for factor in factors[1:]:
        result = np.kron(result, factor)
    return result

def dense_gate(op, operands, n, angle=.73):
    root = np.sqrt(.5)
    matrices = {
        'i': np.eye(2), 'h': np.array([[1, 1], [1, -1]]) * root,
        'x': np.array([[0, 1], [1, 0]]), 'y': np.array([[0, -1j], [1j, 0]]),
        'z': np.diag([1, -1]), 's': np.diag([1, 1j]), 'sdg': np.diag([1, -1j]),
        't': np.diag([1, np.exp(1j*np.pi/4)]), 'tdg': np.diag([1, np.exp(-1j*np.pi/4)]),
        'rx': np.cos(angle/2)*np.eye(2)-1j*np.sin(angle/2)*np.array([[0, 1], [1, 0]]),
        'ry': np.array([[np.cos(angle/2), -np.sin(angle/2)], [np.sin(angle/2), np.cos(angle/2)]]),
        'rz': np.diag([np.exp(-1j*angle/2), np.exp(1j*angle/2)]),
    }
    if op in matrices:
        return embed(matrices[op], operands[0], n)
    size = 2**n
    result = np.zeros((size, size), dtype=complex)
    for column in range(size):
        bits = [(column >> i) & 1 for i in range(n)]
        phase = 1
        if op in ['cx', 'ccx'] and all(bits[q] for q in operands[:-1]):
            bits[operands[-1]] ^= 1
        if op == 'swap' or (op == 'cswap' and bits[operands[0]]):
            a, b = operands[-2:]
            bits[a], bits[b] = bits[b], bits[a]
        if op in ['cz', 'cs', 'ct'] and all(bits[q] for q in operands):
            phase = {'cz': -1, 'cs': 1j, 'ct': np.exp(1j*np.pi/4)}[op]
        row = sum(value << i for i, value in enumerate(bits))
        result[row, column] = phase
    return result

class Numerical(unittest.TestCase):
    def assert_state(self, actual, expected):
        overlap = np.vdot(expected, actual)
        self.assertGreater(abs(overlap), .999999999)
        actual = actual * np.conj(overlap) / abs(overlap)
        self.assertLess(np.max(np.abs(actual-expected)), 1e-10)
        self.assertLess(np.max(np.abs(np.abs(actual)**2-np.abs(expected)**2)), 1e-10)

    def test_every_gate_every_operand_order_on_complex_entangled_state(self):
        preparation = 'ry(.7) a;rz(.8) a;h b;rx(.3) c;cx a,b;'
        initial, _ = execute(preparation)
        gates = {'i': 1, 'h': 1, 'x': 1, 'y': 1, 'z': 1, 's': 1, 'sdg': 1, 't': 1,
                 'tdg': 1, 'rx': 1, 'ry': 1, 'rz': 1, 'cx': 2, 'swap': 2, 'ccx': 3,
                 'cz': 2, 'cs': 2, 'ct': 2, 'cswap': 3}
        for gate, arity in gates.items():
            for operands in itertools.permutations(range(3), arity):
                with self.subTest(gate=gate, operands=operands):
                    op = gate + ('(.73)' if gate in ['rx', 'ry', 'rz'] else '')
                    body = preparation + op + ' ' + ','.join(NAMES[q] for q in operands) + ';'
                    actual, _ = execute(body)
                    self.assert_state(actual, dense_gate(gate, operands, 3) @ initial)

    def test_qiskit_random_circuits(self):
        rng = np.random.default_rng(20261113)
        gates = ['h', 'x', 'y', 'z', 's', 'sdg', 't', 'tdg', 'rx', 'ry', 'rz', 'cx', 'swap', 'ccx', 'cz', 'cs', 'ct', 'cswap']
        for trial in range(80):
            n = int(rng.integers(3, 7)); circuit = QuantumCircuit(n); body = ''
            for _ in range(60):
                gate = str(rng.choice(gates)); arity = 3 if gate in ['ccx', 'cswap'] else 2 if gate in ['cx', 'swap', 'cz', 'cs', 'ct'] else 1
                qs = [int(q) for q in rng.choice(n, arity, replace=False)]
                angle = float(rng.uniform(-5, 5)); args = ','.join(NAMES[q] for q in qs)
                if gate in ['rx', 'ry', 'rz']:
                    body += f'{gate}({angle:.17g}) {args};'; getattr(circuit, gate)(angle, *qs)
                elif gate in ['cs', 'ct']:
                    body += f'{gate} {args};'; circuit.cp(np.pi/(2 if gate == 'cs' else 4), *qs)
                else:
                    body += f'{gate} {args};'; getattr(circuit, gate)(*qs)
            with self.subTest(trial=trial):
                actual, _ = execute(body, n)
                self.assert_state(actual, Statevector.from_instruction(circuit).data)

    def test_norm_after_10000_gates(self):
        body = 'h a;ry(.731) b;rz(-.921) c;cx a,b;ct b,c;' * 2000
        _, result = execute(body)
        self.assertLess(abs(result['norm']-1), 1e-9)

    def test_teleportation_all_measurement_branches(self):
        path = pathlib.Path(__file__).resolve().parents[1] / 'examples/teleportation.qc'
        branches = set()
        for seed in range(32):
            r = subprocess.run([EXE, 'run', str(path), '--json', '--seed', str(seed)], text=True, encoding="utf-8", capture_output=True, check=True)
            result = json.loads(r.stdout)
            original = result['observations'][0]['snapshot']['reduced'][0]
            bob = result['reduced'][2]
            for key in ['x', 'y', 'z', 'purity']:
                self.assertAlmostEqual(original[key], bob[key], delta=1e-10)
            branches.add(tuple(b['value'] for b in result['bits']))
        self.assertEqual(len(branches), 4)

    def test_reset_before_measurement_requires_independent_executions(self):
        source = 'qubit a;qubit b;bit m;h a;cx a,b;reset a;measure b->m;'
        r = subprocess.run([EXE, 'sample', '-', '--shots', '10000', '--json'], input=source, capture_output=True, text=True, encoding="utf-8", check=True)
        data = json.loads(r.stdout)
        self.assertFalse(data['optimized'])
        self.assertEqual(set(data['counts']), {'0', '1'})
        self.assertLess(abs(data['counts']['0']-5000), 250)

    def test_ghz_grover_and_mid_circuit_sampling(self):
        root = pathlib.Path(__file__).resolve().parents[1]
        for example, outcomes in [('ghz', {'000', '111'}), ('grover', {'11'})]:
            r = subprocess.run([EXE, 'sample', str(root/'examples'/f'{example}.qc'), '--shots', '10000', '--json'], capture_output=True, text=True, encoding="utf-8", check=True)
            self.assertEqual(set(json.loads(r.stdout)['counts']), outcomes)
        source = 'qubit a;qubit b;bit x;bit y;h a;measure a->x;if x==1{x b;}measure b->y;'
        r = subprocess.run([EXE, 'sample', '-', '--shots', '10000', '--json'], input=source, capture_output=True, text=True, encoding="utf-8", check=True)
        data = json.loads(r.stdout)
        self.assertFalse(data['optimized'])
        self.assertEqual(set(data['counts']), {'00', '11'})
        self.assertLess(abs(data['counts']['00']-5000), 250)

if __name__ == '__main__':
    unittest.main()
