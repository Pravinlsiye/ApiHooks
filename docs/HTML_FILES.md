# HTML Files Documentation

This document explains the different HTML files in the SiyeFlow project and their purposes.

## HTML Files Overview

There are **3 HTML files** in the project:

1. **`src/SiyeFlow.UI/UI/index.html`** - Production template (embedded)
2. **`src/siye-flow-designer/index.html`** - Development HTML (standalone)
3. **`src/siye-flow-designer/debug.html`** - Debug/testing HTML

---

## 1. Production Template: `src/SiyeFlow.UI/UI/index.html`

**Purpose**: Template file used when the designer is embedded in ASP.NET Core applications.

**Location**: `src/SiyeFlow.UI/UI/index.html`

**Key Features**:
- ✅ **Preserved during builds** - Not overwritten by build script
- ✅ **Template placeholders** - Contains `{{RoutePrefix}}` for dynamic route configuration
- ✅ **Embedded mode** - Configured for embedded use in .NET middleware
- ✅ **UMD script loading** - Uses `siye-flow-designer.umd.js` (global script)
- ✅ **Embedded configuration** - Pre-configured with `window.SiyeFlowConfig`

**Template Placeholders**:
- `{{RoutePrefix}}` - Replaced by middleware with actual route prefix (e.g., `/workflows`)

**Script Loading**:
```html
<script src="/{{RoutePrefix}}/siye-flow-designer.umd.js"></script>
```

**Configuration**:
```javascript
window.SiyeFlowConfig = {
    mode: 'embedded',
    apiBasePath: '/siyeflow',
    hostApis: [...]
};
```

**Usage**: Served by `SiyeFlowMiddleware.cs` after replacing placeholders.

---

## 2. Development HTML: `src/siye-flow-designer/index.html`

**Purpose**: Standalone HTML file for local development and testing.

**Location**: `src/siye-flow-designer/index.html`

**Key Features**:
- ✅ **Development server** - Used with Vite dev server (`npm run dev`)
- ✅ **ES Modules** - Uses `<script type="module">` for TypeScript source
- ✅ **Direct source** - Loads `./src/index.ts` directly (not built files)
- ✅ **Hot reload** - Supports Vite's hot module replacement

**Script Loading**:
```html
<script type="module" src="./src/index.ts"></script>
```

**CSS Loading**:
```html
<link rel="stylesheet" href="./src/styles.css">
```

**Usage**: 
- Development: `npm run dev` → Opens at `http://localhost:3000`
- Preview: `npm run preview` → Preview production build

---

## 3. Debug HTML: `src/siye-flow-designer/debug.html`

**Purpose**: Additional debugging/testing HTML file (if exists).

**Location**: `src/siye-flow-designer/debug.html`

**Usage**: For specific debugging scenarios or test cases.

---

## Key Differences Summary

| Feature | Production (`UI/index.html`) | Development (`siye-flow-designer/index.html`) |
|---------|----------------------------|-----------------------------------------------|
| **Purpose** | Embedded in .NET apps | Standalone development |
| **Script Type** | UMD (global) | ES Modules (TypeScript) |
| **Script Source** | `/workflows/siye-flow-designer.umd.js` | `./src/index.ts` |
| **CSS Source** | `/workflows/style.css` | `./src/styles.css` |
| **Template Placeholders** | ✅ `{{RoutePrefix}}` | ❌ None |
| **Configuration** | Pre-configured embedded config | None (uses defaults) |
| **Build Process** | Preserved during build | Not used in build |
| **Hot Reload** | ❌ No | ✅ Yes (Vite) |
| **Served By** | ASP.NET Middleware | Vite Dev Server |

---

## Build Process Flow

```
1. Developer edits TypeScript in siye-flow-designer/src/
   ↓
2. npm run build → Generates dist/*.js, dist/*.css
   ↓
3. build-designer.ps1 copies dist/* → UI/
   ↓
4. UI/index.html is PRESERVED (not overwritten)
   ↓
5. MSBuild embeds UI/**/* into DLL
   ↓
6. Middleware serves UI/index.html (with {{RoutePrefix}} replaced)
```

---

## Important Notes

### Production Template (`UI/index.html`)

⚠️ **DO NOT DELETE** - This is the template file that gets embedded in the DLL.

⚠️ **Preserved During Build** - The build script explicitly preserves this file.

✅ **Edit Freely** - You can edit this file; changes will be preserved.

✅ **Template Placeholders** - Use `{{RoutePrefix}}` for dynamic routes.

### Development HTML (`siye-flow-designer/index.html`)

✅ **For Development Only** - Not used in production builds.

✅ **Hot Reload** - Changes reflect immediately in dev server.

✅ **TypeScript Source** - Loads TypeScript directly (not compiled).

---

## When to Edit Which File

### Edit `UI/index.html` when:
- Changing embedded configuration
- Updating template placeholders
- Modifying production initialization code
- Changing embedded mode settings

### Edit `siye-flow-designer/index.html` when:
- Testing new features in development
- Debugging TypeScript code
- Experimenting with UI changes
- Local development only

---

## File Locations Reference

```
SiyeFlow/
├── src/
│   ├── SiyeFlow.UI/
│   │   └── UI/
│   │       └── index.html          ← Production template (PRESERVED)
│   └── siye-flow-designer/
│       ├── index.html              ← Development HTML
│       └── debug.html              ← Debug HTML (if exists)
```

---

## Related Files

- **Build Script**: `src/SiyeFlow.UI/build-designer.ps1` - Preserves `UI/index.html`
- **Middleware**: `src/SiyeFlow.UI/SiyeFlowMiddleware.cs` - Processes `{{RoutePrefix}}`
- **Vite Config**: `src/siye-flow-designer/vite.config.ts` - Builds production files

