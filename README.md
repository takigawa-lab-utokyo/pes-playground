# PES Playground

PES Playground is an interactive, educational 2D potential energy surface (PES) explorer. It lets you shape a surface with hills and valleys, detect equilibrium points, and visually experiment with AFIR-like, LUP-like, and IRC-like paths in 2D and 3D.

All calculations run locally in the browser. No external calculation server or molecular-structure data is required.

## Requirements

- Node.js 22.13 or later
- npm (included with Node.js)
- A current version of Chrome, Edge, Firefox, or Safari

Check the installed versions:

```bash
node --version
npm --version
```

If Node.js is not installed, download an LTS release from [nodejs.org](https://nodejs.org/).

## Installation

Clone this repository and install its dependencies:

```bash
git clone <repository-url>
cd <repository-directory>
npm install
```

Replace `<repository-url>` and `<repository-directory>` with the URL and folder name of your GitHub repository.

## Start locally

Start the development server:

```bash
npm run dev
```

Open the URL printed in the terminal, normally:

```text
http://localhost:3000
```

To use a specific port:

```bash
npm run dev -- --port 4173
```

Then open `http://localhost:4173`.

Stop the server with `Ctrl+C` in the terminal.

## Production-style local run

Build the application and start the generated local worker:

```bash
npm run build
npm start
```

Open the localhost URL printed in the terminal. Run `npm run build` again after changing the source code.

## Basic usage

### 1. Shape the surface

1. Choose **Valley** or **Hill**.
2. Adjust **Height / depth**, **Width**, **Long / short axis ratio**, and **Long-axis angle**.
3. Click the PES 2D view to add the feature.
4. Use **Undo last**, **Reset surface**, or **Clear all** when needed. Clear all creates a completely flat surface with `E = 0` everywhere.

Surface editing is available only in **PES 2D**. Use **PES 3D** to rotate and inspect the surface by dragging with the mouse.

### 2. Explore AFIR paths

1. Select one or two EQ points in the 2D view or the EQ list.
2. Set the AFIR direction and artificial force.
3. Press **AFIR** for one directed path, or **Random AFIR** for several random directions.
4. Select an AFIR path in **Path Views → AFIR**. The selected path is highlighted.

**AFIR 2D** and **AFIR 3D** show the virtual surface containing the linear force term used for the selected AFIR path.

### 3. Calculate LUP and IRC paths

1. Select an AFIR path that reached another EQ.
2. Press **LUP** to relax only that selected path.
3. Open **Path Views → LUP** to inspect its path-top (PT) and path-equilibrium (pEQ) points.
4. Select a PT, then press **IRC** to draw the two downhill gradient-flow branches.

### 4. Other view controls

- Use the eye button in each Path Views tab to show or hide that path type.
- Drag the vertical separators to resize panels.
- Use the maximize icon to enter or leave Focus mode.
- Press **Draw** to annotate the 2D view and choose a drawing color beside it.

## Save and load a PES

- **Save JSON** downloads the current hills, valleys, and surface-tool settings as `pes-surface.json`.
- **Load JSON** restores a compatible PES Playground JSON file.

Calculated AFIR, LUP, and IRC paths and freehand annotations are not included in the saved PES file. They should be recalculated after loading a surface.

## Available commands

```bash
npm run dev      # Start the development server
npm run build    # Create a production build
npm start        # Run the built application locally
npm run lint     # Check the source code
npm run format   # Format the source code
```

## Notes

- This application is a visual and educational model, not a quantum-chemistry package.
- AFIR, LUP, and IRC behavior is represented by simplified 2D numerical models.
- The surface and calculated paths remain in browser memory unless the PES is exported as JSON.

