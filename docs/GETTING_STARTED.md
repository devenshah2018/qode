# Workspace reference

Use the workbench to edit `.qc` source, compile it, execute instructions, and inspect results. Source is saved in the current browser when local storage is available.

## Files

| Action | Behavior |
| --- | --- |
| New file | Replace the current buffer with a blank `main.qc` file. |
| Import | Open a UTF-8 `.qc` file, up to 1 MiB. |
| Export code | Download the current source as a `.qc` file. |
| Share | Copy a URL containing the source, seed, and shot count. |
| Templates | Replace the buffer with an optional predefined program. |

Replacing custom source asks for confirmation. Export the source before replacing it if you need a separate copy. The workspace holds one source buffer; it is not a project filesystem.

## Compile and execute

Enter source in the editor, then select **Compile** to validate it without execution. **Run** executes to the end; **Step** executes one instruction. Both compile changed source automatically.

```qode
qubit q;
bit result;
h q;
inspect state;
measure q -> result;
```

This program records the state after H, then writes a measured 0 or 1 to `result`. View recorded inspections under **State → Output**, and the current bit value under **Classical bits**. See [Compiler](COMPILER.md) for validation and [Debugger & console](DEBUGGING.md) for execution controls.

## Syntax help

Hover a gate or keyword for its signature, description, example, and reference link. Press **F1** with the editor cursor on the word for the same help; **Escape** dismisses it. Comments, strings, and unknown names do not show keyword help.

## Save and restore

Source, seed, and shot count are saved locally when browser storage is available. Reloading restores those values but starts a new execution. Runtime position, checkpoints, and results are not saved across page navigation. Export source and results for durable copies.

Share URLs contain source and settings, not an execution checkpoint. Anyone with the link can read that source. Large programs should be shared as `.qc` files. Invalid share links leave the saved source intact.

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| Ctrl/Cmd + Shift + Enter | Compile |
| Ctrl/Cmd + Enter | Run |
| F1 | Syntax help at the cursor |
| Escape | Dismiss syntax help |
| Ctrl/Cmd + Z | Undo a source edit |

## Run locally

From a checkout with the documented prerequisites installed:

```sh
./start.sh
```

Use `./start.sh --open` to open a browser, or `./start.sh --port 5180` to choose a port. See the repository README for installation requirements. The workbench is at `/` and documentation at `/docs/`.
