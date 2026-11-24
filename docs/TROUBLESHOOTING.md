# Troubleshooting

Start with the exact source, the first diagnostic, and a small reproducing program. Qode checks the complete source before execution. An error after a halt is still a compile error, because halt affects execution rather than syntax validation.

## A gate does not run

Check case, declarations, commas, and semicolons. Write `qubit a; h a;`, not an implicit qubit or uppercase `H`. Put every qubit and bit declaration before the first operation. A two-qubit gate needs two different qubits: `cx a, b;`.

Use `qode check file.qc` or read the highlighted source line in the workbench. The diagnostic column counts UTF-8 bytes; an editor may count non-ASCII characters differently. Names are ASCII, while strings and comments can contain Unicode.

## A condition reads an uninitialized bit

A bit declaration reserves storage; it does not set a value. Measure into that bit before using it in a condition. Conditional blocks support gates and nested conditions only. You cannot initialize a bit by writing `bit m = 1;` or by assigning a number directly.

```qode
qubit coin;
qubit target;
bit m;
h coin;
measure coin -> m;
if m == 1 {
    x target;
}
```

## Probabilities are unchanged after a phase gate

This can be correct. Z, S, T, and their controlled variants change phase rather than directly moving basis probabilities. Inspect the complex state, then apply an interference operation such as H to turn a relative phase into a probability difference.

A zero amplitude has no defined phase. The inspector displays a dash rather than assigning it a physical angle. A global phase shared by every amplitude also has no effect on measurement probabilities.

## A qubit looks mixed

Inspect the complete register. An entangled qubit does not have its own independent pure state. Its reduced Bloch vector can be shorter than one even when the full statevector is pure and normalized. Bell qubits each have purity 0.5; this is the expected result.

## Sample is unavailable or reports an error

Use an integer shot count between 1 and 100,000 and include at least one measurement. Invalid sampling input should not prevent Run, Step, or Reset. Text printing and inspection alone do not create a count distribution.

Counts use classical-bit declaration order, not source measurement order. The highest-index declared bit is displayed on the left, and `-` means a bit was never measured. Export results to inspect all counts when the visual histogram shows only the most frequent 64 outcomes.

## Reset and replay seem different

The Reset button resets the entire runtime with the selected seed. The `reset q;` language statement measures one qubit internally and returns it to zero, potentially changing entangled partners.

Back restores PRNG state and therefore repeats the same measurement when replayed. Change the seed for a different reproducible sequence; resetting with the same seed repeats the sequence. A stopped or failed execution has no valid checkpoints; the next execution starts a fresh session.

## A share link fails

Share URLs contain source and settings in a fragment, not a server-side project identifier. A truncated or edited fragment may not decode. The app reports an invalid share and keeps the saved source. Large programs should be shared as `.qc` files.

Clipboard access may be unavailable in an insecure context or because of browser permissions. Export code still works. Local storage may be unavailable or full; editing and running remain available, but use Export code for a durable copy.

## File import fails

Import requires a readable UTF-8 text file of at most 1 MiB. Invalid UTF-8 is rejected instead of silently replacing bytes. The existing source is retained. Source containing NUL bytes fails compilation even if the rest of the file is valid text.

## The engine does not load

Reload the page, then use **Reset** to retry. Export code before clearing browser storage. If the problem continues, report the page URL, browser version, and message shown under Problems.

For a local copy, start the app with `./start.sh` and open its printed HTTP URL. See the repository README for installation requirements.

## The browser is slow or hits a limit

Quantum state storage doubles for each extra qubit. Use fewer qubits and instructions, remove repeated inspections, or lower the shot count. The browser supports 16 simulation qubits, but Step and Back are limited to 12. The native engine supports up to 24.

Use **Stop** to cancel the active execution. Qode also caps source, instructions, observations, and checkpoint storage. Norm and reduced states always use the full vector, even when the UI truncates amplitude rows. A display limit is not a simulation approximation.
