# Neobrutalism Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o tema dark Material-3 do Smoking Tracker por um sistema neobrutalism light (preto + amarelo sobre fundo creme Parchment), atualizando tokens, componentes UI base, componentes do app e páginas em um único PR.

**Architecture:** Duas camadas: (1) **tokens** — `src/index.css` (CSS vars), `tailwind.config.ts` (radius/shadow), `index.html` (fontes), `package.json` (remove `next-themes`); (2) **classes** — variantes nos shadcn UI base, reescrita inline de cards/navegação/charts/páginas que ainda usam tokens legados (`surface-container-*`, `on-surface*`, `outline-variant`). Light-only — dark mode removido.

**Tech Stack:** React 18, Vite, Tailwind 3, shadcn-style components (Radix + CVA), recharts, sonner, vaul, vitest.

**Referência:** spec em `docs/superpowers/specs/2026-06-26-neobrutalism-redesign-design.md`.

**Verificação contínua:** este redesign é majoritariamente visual. Para cada task: `npm run build` deve passar (pega classes Tailwind inválidas, erros de tipo) e `npm run test:run` no fim da Fase 5. Inspeção visual com `npm run dev` ao final.

---

## Fase 1 — Fundação (tokens, fontes, deps)

### Task 1: Substituir CSS vars em `src/index.css`

**Files:**
- Modify: `src/index.css` (arquivo inteiro)

- [ ] **Step 1: Reescrever o arquivo com os novos tokens**

Os tokens legados (`surface-container-*`, `on-surface*`, `outline-variant`, `on-primary`) ficam temporariamente apontando para valores neobrutalism. Isso evita quebra visual intermediária enquanto as páginas/componentes ainda os referenciam. A Task 25 (cleanup final) os remove depois.

Substituir o conteúdo de `src/index.css` por:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Surfaces */
    --background:               42 56% 92%;   /* #F5EFDF Parchment */
    --foreground:                0  0%  7%;   /* #111111 */

    --card:                      0  0% 100%;  /* #FFFFFF */
    --card-foreground:           0  0%  7%;

    --popover:                   0  0% 100%;
    --popover-foreground:        0  0%  7%;

    --muted:                    42 30% 88%;   /* #ECE5D2 */
    --muted-foreground:          0  0% 40%;   /* #666666 */

    --accent:                   47 100% 62%;  /* #FFD23F amarelo */
    --accent-foreground:         0  0%  7%;

    /* Brand */
    --primary:                  47 100% 62%;
    --primary-foreground:        0  0%  7%;

    --secondary:                 0  0% 100%;
    --secondary-foreground:      0  0%  7%;

    --destructive:               0 84% 60%;   /* #EF4444 */
    --destructive-foreground:    0  0% 100%;

    /* Borders / inputs / focus */
    --border:                    0  0%  7%;
    --input:                     0  0% 100%;
    --ring:                      0  0%  7%;

    --radius: 0rem;

    /* Compat (legacy tokens used em pages/components até serem migrados; removidos na Task 25) */
    --surface-container-lowest:  0  0% 100%;
    --surface-container-low:     0  0% 100%;
    --surface-container:         0  0% 100%;
    --surface-container-high:   42 30% 88%;
    --surface-container-highest:42 30% 88%;
    --on-surface:                0  0%  7%;
    --on-surface-variant:        0  0% 40%;
    --on-primary:                0  0%  7%;
    --outline-variant:           0  0%  7%;
  }
}

@layer base {
  * {
    @apply border-border;
  }

  html {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  html::-webkit-scrollbar {
    display: none;
  }

  body {
    @apply bg-background text-foreground;
    font-family: 'Space Grotesk', system-ui, sans-serif;
    font-weight: 500;
    -webkit-font-smoothing: antialiased;
  }

  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  input[type=number] {
    -moz-appearance: textfield;
  }
}

/* Material Symbols */
.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  font-family: 'Material Symbols Outlined';
  font-style: normal;
  font-weight: normal;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  -webkit-font-smoothing: antialiased;
  user-select: none;
}

.material-symbols-filled {
  font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}
```

Tokens removidos: `surface-container-*`, `on-surface*`, `on-primary`, `outline-variant`. Estes não existirão mais — todas as referências serão substituídas nas tasks 14-15-16 (componentes/páginas).

- [ ] **Step 2: Commit**

```bash
git add src/index.css
git commit -m "feat(theme): substitui CSS vars por paleta neobrutalism light"
```

---

### Task 2: Atualizar `tailwind.config.ts`

**Files:**
- Modify: `tailwind.config.ts` (arquivo inteiro)

- [ ] **Step 1: Reescrever o arquivo**

Mantém os tokens `surface-container-*`/`on-surface*`/`outline-variant` no `colors` (compat) — eles são removidos na Task 25.

Substituir o conteúdo por:

```ts
import type { Config } from "tailwindcss";

export default {
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        /* Compat — removidos na Task 25 */
        'surface-container-lowest': 'hsl(var(--surface-container-lowest))',
        'surface-container-low':    'hsl(var(--surface-container-low))',
        'surface-container':        'hsl(var(--surface-container))',
        'surface-container-high':   'hsl(var(--surface-container-high))',
        'surface-container-highest':'hsl(var(--surface-container-highest))',
        'on-surface':               'hsl(var(--on-surface))',
        'on-surface-variant':       'hsl(var(--on-surface-variant))',
        'on-primary':               'hsl(var(--on-primary))',
        'outline-variant':          'hsl(var(--outline-variant))',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius))",
        sm: "calc(var(--radius))",
      },
      boxShadow: {
        brutal:    "3px 3px 0 hsl(var(--border))",
        "brutal-sm": "2px 2px 0 hsl(var(--border))",
        "brutal-lg": "6px 6px 0 hsl(var(--border))",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to:   { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
```

Mudanças: removido `darkMode: ["class"]`, removidos tokens `surface-container-*`/`on-surface*`/`outline-variant`, `borderRadius.lg/md/sm` todos viram 0, adicionado `boxShadow.brutal*`.

- [ ] **Step 2: Commit**

```bash
git add tailwind.config.ts
git commit -m "feat(theme): tailwind neobrutalism (radius 0, shadow brutal, sem dark)"
```

---

### Task 3: Atualizar `index.html` (fontes e tema)

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Remover `class="dark"` do `<html>`, trocar Inter por Space Grotesk, ajustar theme-color**

Substituir conteúdo de `index.html` por:

```html
<!doctype html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="manifest" href="./manifest.json" />
  <meta name="theme-color" content="#F5EFDF" />
  <title>Smoking Tracker</title>
  <meta property="og:title" content="Smoking Tracker" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="/og-image.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet" />
</head>

<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>

</html>
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat(theme): troca Inter por Space Grotesk, remove class=dark"
```

---

### Task 4: Reescrever `src/components/ui/sonner.tsx` (remove next-themes)

**Files:**
- Modify: `src/components/ui/sonner.tsx`

- [ ] **Step 1: Substituir o arquivo**

```tsx
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-2 group-[.toaster]:border-border group-[.toaster]:shadow-brutal group-[.toaster]:rounded-none",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:border-2 group-[.toast]:border-border group-[.toast]:rounded-none",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:border-2 group-[.toast]:border-border group-[.toast]:rounded-none",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/sonner.tsx
git commit -m "feat(theme): sonner sem next-themes, estilo brutal"
```

---

### Task 5: Remover `next-themes` do `package.json`

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Rodar a remoção**

```bash
npm uninstall next-themes
```

Expected: `next-themes` sai de `dependencies`; `package.json` e `package-lock.json` atualizados.

- [ ] **Step 2: Garantir que o build ainda passa**

```bash
npm run build
```

Expected: build completa sem erros (PWA gera dist/).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): remove next-themes (light-only)"
```

---

### Task 6: Remover `src/components/NavLink.tsx` (dead code)

`NavLink.tsx` importa `react-router-dom` que não está nas dependências do projeto — é arquivo morto de template. O app navega por estado `tab` em `App.tsx`.

**Files:**
- Delete: `src/components/NavLink.tsx`

- [ ] **Step 1: Confirmar que não há uso**

```bash
grep -rn "from '@/components/NavLink'\|from './NavLink'" src
```

Expected: zero linhas além do próprio arquivo.

- [ ] **Step 2: Apagar e commitar**

```bash
git rm src/components/NavLink.tsx
git commit -m "chore: remove NavLink dead code"
```

---

## Fase 2 — Componentes UI base (`src/components/ui/*`)

Todas as APIs (props, ref forwarding, exports) ficam idênticas. Só muda o conteúdo dos `cn(...)` / `cva(...)`.

### Task 7: Reescrever `button.tsx`

**Files:**
- Modify: `src/components/ui/button.tsx`

- [ ] **Step 1: Substituir o arquivo**

```tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-bold uppercase tracking-wide ring-offset-background transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border-2 border-border shadow-brutal active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
        secondary:
          "bg-secondary text-secondary-foreground border-2 border-border shadow-brutal active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
        destructive:
          "bg-destructive text-destructive-foreground border-2 border-border shadow-brutal active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
        outline:
          "bg-card text-foreground border-2 border-border shadow-brutal active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
        ghost:
          "bg-transparent text-foreground hover:bg-muted",
        link:
          "bg-transparent text-foreground underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-12 px-6",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/button.tsx
git commit -m "feat(ui): button neobrutalism (borda 2, sombra brutal, press)"
```

---

### Task 8: Reescrever `card.tsx`

**Files:**
- Modify: `src/components/ui/card.tsx`

- [ ] **Step 1: Substituir o arquivo**

```tsx
import * as React from "react";

import { cn } from "@/lib/utils";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("bg-card text-card-foreground border-2 border-border shadow-brutal", className)}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-2xl font-bold leading-none tracking-tight", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />,
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/card.tsx
git commit -m "feat(ui): card neobrutalism (borda 2, sombra brutal, radius 0)"
```

---

### Task 9: Reescrever `input.tsx`

**Files:**
- Modify: `src/components/ui/input.tsx`

- [ ] **Step 1: Substituir o arquivo**

```tsx
import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full bg-input text-foreground border-2 border-border px-3 py-2 text-base placeholder:text-muted-foreground file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground focus:outline-none focus:ring-0 focus:shadow-brutal-sm focus:-translate-x-[1px] focus:-translate-y-[1px] transition-transform disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/input.tsx
git commit -m "feat(ui): input neobrutalism (borda 2, focus brutal-sm)"
```

---

### Task 10: Reescrever `dialog.tsx`

**Files:**
- Modify: `src/components/ui/dialog.tsx`

- [ ] **Step 1: Substituir o arquivo**

```tsx
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border-2 border-border bg-card p-6 shadow-brutal-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-bold leading-none tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/dialog.tsx
git commit -m "feat(ui): dialog neobrutalism (overlay 40%, painel borda 2 + shadow lg)"
```

---

### Task 11: Reescrever `drawer.tsx`

**Files:**
- Modify: `src/components/ui/drawer.tsx`

- [ ] **Step 1: Substituir o arquivo**

```tsx
import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";

import { cn } from "@/lib/utils";

const Drawer = ({ shouldScaleBackground = true, ...props }: React.ComponentProps<typeof DrawerPrimitive.Root>) => (
  <DrawerPrimitive.Root shouldScaleBackground={shouldScaleBackground} {...props} />
);
Drawer.displayName = "Drawer";

const DrawerTrigger = DrawerPrimitive.Trigger;

const DrawerPortal = DrawerPrimitive.Portal;

const DrawerClose = DrawerPrimitive.Close;

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay ref={ref} className={cn("fixed inset-0 z-50 bg-black/40", className)} {...props} />
));
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName;

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DrawerPortal>
    <DrawerOverlay />
    <DrawerPrimitive.Content
      ref={ref}
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col border-t-2 border-border bg-card shadow-brutal-lg",
        className,
      )}
      {...props}
    >
      <div className="mx-auto mt-4 h-2 w-[100px] bg-foreground" />
      {children}
    </DrawerPrimitive.Content>
  </DrawerPortal>
));
DrawerContent.displayName = "DrawerContent";

const DrawerHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("grid gap-1.5 p-4 text-center sm:text-left", className)} {...props} />
);
DrawerHeader.displayName = "DrawerHeader";

const DrawerFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mt-auto flex flex-col gap-2 p-4", className)} {...props} />
);
DrawerFooter.displayName = "DrawerFooter";

const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn("text-lg font-bold leading-none tracking-tight", className)}
    {...props}
  />
));
DrawerTitle.displayName = DrawerPrimitive.Title.displayName;

const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
DrawerDescription.displayName = DrawerPrimitive.Description.displayName;

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/drawer.tsx
git commit -m "feat(ui): drawer neobrutalism (borda 2, handle preta)"
```

---

### Task 12: Reescrever `tabs.tsx`, `tooltip.tsx`, `toast.tsx`, `label.tsx`

**Files:**
- Modify: `src/components/ui/tabs.tsx`
- Modify: `src/components/ui/tooltip.tsx`
- Modify: `src/components/ui/toast.tsx`
- Modify: `src/components/ui/label.tsx`

- [ ] **Step 1: `src/components/ui/tabs.tsx`**

```tsx
import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center bg-muted border-2 border-border p-1 text-muted-foreground",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap px-3 py-1.5 text-sm font-bold uppercase tracking-wide transition-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-2 data-[state=active]:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
```

- [ ] **Step 2: `src/components/ui/tooltip.tsx`**

```tsx
import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden bg-foreground text-card border-2 border-border px-2 py-1 text-xs font-semibold animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
      className,
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
```

- [ ] **Step 3: `src/components/ui/toast.tsx`**

```tsx
import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
      className,
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden border-2 border-border p-6 pr-8 shadow-brutal transition-transform data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "bg-card text-foreground",
        destructive: "destructive group bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return <ToastPrimitives.Root ref={ref} className={cn(toastVariants({ variant }), className)} {...props} />;
});
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center border-2 border-border bg-card px-3 text-sm font-bold uppercase tracking-wide transition-none hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 p-1 text-foreground/70 opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring",
      className,
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title ref={ref} className={cn("text-sm font-bold", className)} {...props} />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description ref={ref} className={cn("text-sm opacity-90", className)} {...props} />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;

type ToastActionElement = React.ReactElement<typeof ToastAction>;

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};
```

- [ ] **Step 4: `src/components/ui/label.tsx`**

```tsx
import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const labelVariants = cva(
  "text-xs font-semibold uppercase tracking-wider text-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
);

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} {...props} />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
```

- [ ] **Step 5: Verificar build**

```bash
npm run build
```

Expected: passa sem erro de Tailwind class desconhecida.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/tabs.tsx src/components/ui/tooltip.tsx src/components/ui/toast.tsx src/components/ui/label.tsx
git commit -m "feat(ui): tabs/tooltip/toast/label neobrutalism"
```

---

## Fase 3 — Componentes do app (`src/components/*`)

### Task 13: Reescrever `CounterCard.tsx`

**Files:**
- Modify: `src/components/CounterCard.tsx`

- [ ] **Step 1: Substituir o arquivo**

```tsx
import { EventType } from '@/types';

interface CounterCardProps {
  type: EventType;
  count: number;
  onTap: () => void;
}

const META: Record<EventType, { label: string; icon: string }> = {
  tobacco:  { label: 'Tabaco',   icon: 'smoke_free' },
  cannabis: { label: 'Cannabis', icon: 'potted_plant' },
};

export const CounterCard = ({ type, count, onTap }: CounterCardProps) => {
  const { label, icon } = META[type];

  return (
    <button
      onClick={onTap}
      className="flex flex-col items-start gap-3 bg-card text-foreground p-5 border-2 border-border shadow-brutal active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-transform"
    >
      <div className="flex w-full justify-between items-center">
        <span className="material-symbols-outlined text-2xl">{icon}</span>
        <span className="inline-block bg-primary text-primary-foreground border-2 border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
          {label}
        </span>
      </div>
      <span className="text-5xl font-bold tracking-tight">{count}</span>
    </button>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/CounterCard.tsx
git commit -m "feat(ui): CounterCard neobrutalism"
```

---

### Task 14: Reescrever `BottomNav.tsx`

**Files:**
- Modify: `src/components/BottomNav.tsx`

- [ ] **Step 1: Substituir o arquivo**

```tsx
type Tab = 'tracker' | 'history' | 'goals';

interface BottomNavProps {
  tab: Tab;
  onChange: (tab: Tab) => void;
}

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'tracker', label: 'Tracker', icon: 'add_circle' },
  { id: 'history', label: 'History', icon: 'history' },
  { id: 'goals',   label: 'Goals',   icon: 'bolt' },
];

export const BottomNav = ({ tab, onChange }: BottomNavProps) => (
  <nav
    aria-label="Main navigation"
    className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center h-20 pb-safe px-4 bg-card border-t-2 border-border z-50"
  >
    {TABS.map(({ id, label, icon }) => {
      const active = tab === id;
      return (
        <button
          key={id}
          aria-label={label}
          aria-current={active ? 'page' : undefined}
          onClick={() => onChange(id)}
          className={`flex flex-col items-center justify-center gap-1 px-3 py-1 transition-none ${
            active
              ? 'bg-primary text-primary-foreground border-2 border-border shadow-brutal-sm'
              : 'text-foreground hover:bg-muted'
          }`}
        >
          <span className="material-symbols-outlined">{icon}</span>
          <span className="font-bold uppercase text-[10px] tracking-wider">{label}</span>
        </button>
      );
    })}
  </nav>
);
```

- [ ] **Step 2: Commit**

```bash
git add src/components/BottomNav.tsx
git commit -m "feat(ui): BottomNav neobrutalism (active = bg-primary)"
```

---

### Task 15: Reescrever `TopNav.tsx`

**Files:**
- Modify: `src/components/TopNav.tsx`

- [ ] **Step 1: Substituir o arquivo**

```tsx
import { EventType } from '@/types';
import { UseTrackerAPI } from '@/hooks/useTracker';
import { GoalsContent } from '@/components/GoalsContent';

type Tab = 'tracker' | 'history' | 'goals';

interface TopNavProps {
  tab: Tab;
  onChange: (tab: Tab) => void;
  tracker: UseTrackerAPI;
  onOpenNewEvent: (type: EventType) => void;
}

const NAV_TABS: { id: Tab; label: string }[] = [
  { id: 'tracker', label: 'Tracker' },
  { id: 'history', label: 'History' },
];

export const TopNav = ({ tab, onChange, tracker, onOpenNewEvent }: TopNavProps) => {
  const streak = tracker.getCurrentStreak();
  const currentGoal = tracker.getCurrentGoal();
  const totals = tracker.getTodayTotals();
  const todayTotal = totals.tobacco + totals.cannabis;

  return (
    <>
      {/* Fixed header — desktop only */}
      <header className="hidden md:flex fixed top-0 w-full z-50 bg-background h-16 items-center justify-between px-6 border-b-2 border-border">
        <span className="text-foreground font-bold tracking-tight text-xl">Smoking Tracker</span>
        <nav className="flex gap-3 items-center">
          {NAV_TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => onChange(id)}
              aria-current={tab === id ? 'page' : undefined}
              className={`font-bold uppercase tracking-wide text-sm px-3 py-1 border-2 ${
                tab === id
                  ? 'bg-primary text-primary-foreground border-border shadow-brutal-sm'
                  : 'border-transparent text-foreground hover:bg-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="w-10" />
      </header>

      {/* Fixed sidebar — desktop only */}
      <aside className="hidden md:flex flex-col fixed top-16 left-0 w-80 h-[calc(100vh-64px)] bg-card border-r-2 border-border p-6 space-y-8 overflow-y-auto z-40">
        {/* Quick Log */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
            Quick Log
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onOpenNewEvent('tobacco')}
              className="flex flex-col items-center justify-center gap-2 p-4 bg-card border-2 border-border shadow-brutal-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-transform"
            >
              <span className="material-symbols-outlined">smoking_rooms</span>
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Tabaco
              </span>
            </button>
            <button
              onClick={() => onOpenNewEvent('cannabis')}
              className="flex flex-col items-center justify-center gap-2 p-4 bg-card border-2 border-border shadow-brutal-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-transform"
            >
              <span className="material-symbols-outlined">potted_plant</span>
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Cannabis
              </span>
            </button>
          </div>
        </div>

        {/* Streak + Consumo */}
        <div className="bg-card border-2 border-border shadow-brutal p-5 flex gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2">
              Streak
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold tracking-tight">
                {currentGoal ? streak : '—'}
              </span>
              <span className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                dias
              </span>
            </div>
          </div>
          <div className="w-[2px] bg-border self-stretch" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider font-bold mb-2">
              Hoje
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">{todayTotal}</span>
              {currentGoal && (
                <span className="text-muted-foreground text-sm font-semibold">
                  / {currentGoal.limit}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Goals section */}
        <div className="border-t-2 border-border pt-8">
          <GoalsContent tracker={tracker} />
        </div>
      </aside>
    </>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/TopNav.tsx
git commit -m "feat(ui): TopNav neobrutalism (header + sidebar)"
```

---

### Task 16: Reescrever `CalendarView.tsx`

**Files:**
- Modify: `src/components/CalendarView.tsx`

- [ ] **Step 1: Substituir o arquivo**

```tsx
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  subDays,
  addMonths,
  subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MonthlyChart } from './MonthlyChart';
import {
  getDaysInRange,
  getEarliestEventMonth,
  getMonthKey,
  todayKey,
} from '@/lib/events';
import { DayTotals, TrackerEvent } from '@/types';
import { DayGoalStatus } from '@/lib/stats';

export interface DayCellProps {
  dayKey: string;
  getDayTotals: (dayKey: string) => DayTotals;
  getDayGoalStatus: (dayKey: string) => DayGoalStatus;
  onDayClick: (dayKey: string) => void;
  todayStr: string;
}

export const DayCell = ({
  dayKey,
  getDayTotals,
  getDayGoalStatus,
  onDayClick,
  todayStr,
}: DayCellProps) => {
  const totals = getDayTotals(dayKey);
  const total = totals.tobacco + totals.cannabis;
  const isToday = dayKey === todayStr;
  const date = parseISO(dayKey + 'T00:00:00');
  const goalStatus = getDayGoalStatus(dayKey);
  const weekday = format(date, 'EEE', { locale: ptBR }).slice(0, 3);

  const bgClass =
    goalStatus === 'within' ? 'bg-primary text-primary-foreground'
    : goalStatus === 'over' ? 'bg-foreground text-card'
    : 'bg-card text-foreground';

  return (
    <div
      onClick={() => onDayClick(dayKey)}
      className={cn(
        'relative flex flex-col items-center gap-1 p-2 border-2 border-border cursor-pointer active:translate-x-[1px] active:translate-y-[1px] transition-transform',
        bgClass,
        isToday && 'shadow-brutal',
        total === 0 && goalStatus === 'no-goal' && 'opacity-60',
      )}
    >
      <div className="text-[0.55rem] font-bold uppercase">{weekday}</div>
      <div className="text-[0.7rem] font-bold">{format(date, 'dd')}</div>
      {total > 0 ? (
        <div className="text-[0.7rem] font-bold">{total}</div>
      ) : (
        <span className="text-[0.6rem]">—</span>
      )}
    </div>
  );
};

export interface MonthNavigationProps {
  label: string;
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
}

export const MonthNavigation = ({
  label,
  canGoBack,
  canGoForward,
  onBack,
  onForward,
}: MonthNavigationProps) => (
  <div className="flex items-center justify-between">
    <button
      onClick={onBack}
      disabled={!canGoBack}
      aria-label="Mês anterior"
      className="w-8 h-8 flex items-center justify-center bg-card border-2 border-border shadow-brutal-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-transform disabled:opacity-30"
    >
      <span className="material-symbols-outlined text-sm">chevron_left</span>
    </button>
    <span className="text-sm font-bold uppercase tracking-wider capitalize">{label}</span>
    <button
      onClick={onForward}
      disabled={!canGoForward}
      aria-label="Próximo mês"
      className="w-8 h-8 flex items-center justify-center bg-card border-2 border-border shadow-brutal-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-transform disabled:opacity-30"
    >
      <span className="material-symbols-outlined text-sm">chevron_right</span>
    </button>
  </div>
);

interface CalendarViewProps {
  getDayTotals: (dayKey: string) => DayTotals;
  getDayGoalStatus: (dayKey: string) => DayGoalStatus;
  onDayClick: (dayKey: string) => void;
  events: TrackerEvent[];
  goalLimit: number | null;
  className?: string;
}

export const CalendarView = ({ getDayTotals, getDayGoalStatus, onDayClick, events, goalLimit, className }: CalendarViewProps) => {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState<Date>(() => startOfMonth(new Date()));

  const earliest = useMemo(() => getEarliestEventMonth(events), [events]);
  const currentMonthKey = getMonthKey(today);
  const viewMonthKey = getMonthKey(viewMonth);

  const canGoBack = earliest !== null && viewMonth > earliest;
  const canGoForward = viewMonthKey !== currentMonthKey;

  const goBack = () => {
    if (canGoBack) setViewMonth((m) => subMonths(m, 1));
  };
  const goForward = () => {
    if (canGoForward) setViewMonth((m) => addMonths(m, 1));
  };

  const weekDays = getDaysInRange(subDays(today, 6), today);
  const monthDays = getDaysInRange(startOfMonth(viewMonth), endOfMonth(viewMonth));
  const todayStr = todayKey();

  const monthLabel = format(viewMonth, 'MMMM yyyy', { locale: ptBR });

  return (
    <Card
      className={cn("p-4 sm:p-6 sm:flex sm:flex-col", className)}
    >
      {/* Mobile: tabs (semana / mês) */}
      <div className="sm:hidden">
        <Tabs defaultValue="week" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="week">Semana</TabsTrigger>
            <TabsTrigger value="month">Mês</TabsTrigger>
          </TabsList>

          <TabsContent value="week" className="mt-0">
            <div className="grid grid-cols-7 gap-1.5">
              {weekDays.map((d) => (
                <DayCell
                  key={d}
                  dayKey={d}
                  getDayTotals={getDayTotals}
                  getDayGoalStatus={getDayGoalStatus}
                  onDayClick={onDayClick}
                  todayStr={todayStr}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="month" className="mt-0">
            <MonthNavigation
              label={monthLabel}
              canGoBack={canGoBack}
              canGoForward={canGoForward}
              onBack={goBack}
              onForward={goForward}
            />
            <MonthlyChart dayKeys={monthDays} getDayTotals={getDayTotals} onDayClick={onDayClick} events={events} goalLimit={goalLimit} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Desktop: semana + mês empilhados, preenchendo a altura */}
      <div className="hidden sm:flex flex-col flex-1 min-h-0 gap-0">
        {/* Últimos 7 dias */}
        <div className="shrink-0">
          <p className="text-xs font-bold uppercase tracking-wider mb-3">
            Últimos 7 dias
          </p>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((d) => (
              <DayCell
                key={d}
                dayKey={d}
                getDayTotals={getDayTotals}
                getDayGoalStatus={getDayGoalStatus}
                onDayClick={onDayClick}
                todayStr={todayStr}
              />
            ))}
          </div>
        </div>

        <div className="my-5 border-t-2 border-border shrink-0" />

        {/* Gráfico mensal — preenche o restante */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="shrink-0 mb-3">
            <MonthNavigation
              label={monthLabel}
              canGoBack={canGoBack}
              canGoForward={canGoForward}
              onBack={goBack}
              onForward={goForward}
            />
          </div>
          <div className="flex-1 min-h-0">
            <MonthlyChart
              dayKeys={monthDays}
              getDayTotals={getDayTotals}
              onDayClick={onDayClick}
              events={events}
              goalLimit={goalLimit}
              className="h-full"
            />
          </div>
        </div>
      </div>
    </Card>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/CalendarView.tsx
git commit -m "feat(ui): CalendarView neobrutalism (chips amarelo/preto/branco)"
```

---

### Task 17: Reescrever `MonthlyChart.tsx`

**Files:**
- Modify: `src/components/MonthlyChart.tsx`

- [ ] **Step 1: Substituir o arquivo**

```tsx
import {
  Bar,
  ComposedChart,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { DayTotals, TrackerEvent } from '@/types';

interface MonthlyChartProps {
  dayKeys: string[];
  getDayTotals: (dayKey: string) => DayTotals;
  onDayClick: (dayKey: string) => void;
  events: TrackerEvent[];
  goalLimit: number | null;
  className?: string;
}

export const MonthlyChart = ({ dayKeys, getDayTotals, onDayClick, goalLimit, className }: MonthlyChartProps) => {
  const chartData = dayKeys.map((dayKey) => {
    const totals = getDayTotals(dayKey);
    return {
      dayKey,
      day: format(parseISO(dayKey + 'T00:00:00'), 'dd'),
      fullDate: format(parseISO(dayKey + 'T00:00:00'), 'dd/MM'),
      tobacco: totals.tobacco,
      cannabis: totals.cannabis,
      total: totals.tobacco + totals.cannabis,
    };
  });

  const handleChartClick = (e: any) => {
    const payload = e?.activePayload?.[0]?.payload;
    if (payload?.dayKey) onDayClick(payload.dayKey);
  };

  return (
    <div className={cn("w-full", className ?? "h-[200px] mt-4 mb-6")} style={{ fontFamily: 'inherit' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} onClick={handleChartClick}>
          <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="hsl(var(--foreground))" opacity={0.15} />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--foreground))' }}
            tick={{ fontSize: 12, fill: 'hsl(var(--foreground))', fontFamily: 'inherit', fontWeight: 600 }}
            interval={0}
          />
          <YAxis
            allowDecimals={false}
            domain={[0, (dataMax: number) => Math.max(goalLimit != null ? goalLimit + 3 : 1, dataMax)]}
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--foreground))' }}
            tick={{ fontSize: 12, fill: 'hsl(var(--foreground))', fontFamily: 'inherit', fontWeight: 600 }}
            width={20}
          />
          <Tooltip
            cursor={{ fill: 'hsl(var(--primary))', opacity: 0.2 }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const p = payload[0].payload as {
                  fullDate: string;
                  tobacco: number;
                  cannabis: number;
                };
                return (
                  <div className="bg-card text-foreground border-2 border-border shadow-brutal p-2">
                    <div className="text-xs font-bold uppercase tracking-wider mb-1">{p.fullDate}</div>
                    <div className="flex gap-3 text-sm font-bold">
                      <span>T: {p.tobacco}</span>
                      <span>C: {p.cannabis}</span>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          {goalLimit != null && (
            <ReferenceLine
              y={goalLimit}
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              ifOverflow="extendDomain"
            />
          )}
          <Bar dataKey="total" name="Total" fill="hsl(var(--foreground))" />
          <Legend
            wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }}
            formatter={(value) => (
              <span style={{ color: 'hsl(var(--foreground))', fontFamily: 'inherit', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{value}</span>
            )}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
```

Mudanças: troca linhas tabaco/cannabis por uma única **barra preta sólida** com o total do dia (mais brutal), adiciona `ReferenceLine` amarela na meta, tooltip custom em vez de Card, eixos com `stroke` preto.

- [ ] **Step 2: Commit**

```bash
git add src/components/MonthlyChart.tsx
git commit -m "feat(ui): MonthlyChart neobrutalism (barras pretas + linha amarela de meta)"
```

---

### Task 18: Reescrever `GoalsContent.tsx`

**Files:**
- Modify: `src/components/GoalsContent.tsx`

- [ ] **Step 1: Substituir o arquivo**

```tsx
import { useRef, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { UseTrackerAPI, ImportOutcome } from '@/hooks/useTracker';
import { ImportError } from '@/lib/export';
import { todayKey } from '@/lib/events';

interface GoalsContentProps {
  tracker: UseTrackerAPI;
}

const IMPORT_ERROR_MESSAGES: Record<ImportError, string> = {
  'invalid-json': 'Arquivo não é um JSON válido',
  'invalid-shape': 'Arquivo não parece ser um backup do Smoking Tracker',
  'unsupported-version': 'Versão do arquivo não suportada',
  'invalid-events': 'Arquivo contém eventos inválidos',
  'invalid-goals': 'Arquivo contém metas inválidas',
};

export const GoalsContent = ({ tracker }: GoalsContentProps) => {
  const currentGoal = tracker.getCurrentGoal();
  const [goalValue, setGoalValue] = useState(currentGoal?.limit ?? 10);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setGoalValue(currentGoal?.limit ?? 10);
  }, [currentGoal?.limit]);

  const handleSaveGoal = () => {
    tracker.setGoal(goalValue);
    toast.success('Meta atualizada');
  };

  const handleRemoveGoal = () => {
    if (!window.confirm('Remover meta? O streak volta para zero.')) return;
    tracker.setGoal(null);
    toast.success('Meta removida');
  };

  const handleExport = () => {
    const json = tracker.exportEvents();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smoking-tracker-${todayKey()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Backup exportado');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const raw = await file.text();
      const result: ImportOutcome = tracker.importEvents(raw);
      if (result.ok) {
        const parts: string[] = [];
        if (result.added > 0 || result.skipped > 0) {
          parts.push(`${result.added} eventos importados (${result.skipped} duplicados)`);
        }
        if (result.goalsAdded > 0) parts.push(`${result.goalsAdded} metas importadas`);
        toast.success(parts.join('. ') || 'Nenhum dado novo encontrado');
      } else {
        toast.error(IMPORT_ERROR_MESSAGES[result.error]);
      }
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-10">
      {/* Goal section */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider mb-4">
          Meta Diária
        </h2>
        <div className="bg-card border-2 border-border shadow-brutal p-5">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary border-2 border-border flex items-center justify-center">
                <span className="material-symbols-outlined">track_changes</span>
              </div>
              <div>
                <h4 className="font-bold">Limite por dia</h4>
                <p className="text-xs text-muted-foreground">Tabaco + Cannabis combinados</p>
              </div>
            </div>
            <span className="font-bold text-3xl tracking-tight">
              {String(goalValue).padStart(2, '0')}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={20}
            value={goalValue}
            onChange={(e) => setGoalValue(Number(e.target.value))}
            aria-label="Meta diária"
            className="w-full h-2 bg-muted appearance-none cursor-pointer accent-primary mb-4 border-2 border-border"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveGoal}
              aria-label="Salvar meta"
              className="flex-1 py-2.5 bg-primary text-primary-foreground border-2 border-border shadow-brutal-sm text-sm font-bold uppercase tracking-wider active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-transform"
            >
              Salvar Meta
            </button>
            {currentGoal && (
              <button
                onClick={handleRemoveGoal}
                aria-label="Remover meta"
                className="text-xs text-destructive hover:underline px-2 font-semibold"
              >
                Remover
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Data section */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider mb-4">
          Dados
        </h2>
        <div className="bg-card border-2 border-border shadow-brutal">
          <button
            onClick={handleExport}
            aria-label="Exportar JSON"
            className="w-full p-4 flex items-center gap-3 border-b-2 border-border hover:bg-muted text-left transition-colors"
          >
            <span className="material-symbols-outlined">download</span>
            <div>
              <p className="text-sm font-bold">Exportar JSON</p>
              <p className="text-[10px] text-muted-foreground">Baixa backup de todos os eventos</p>
            </div>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            aria-label="Importar JSON"
            className="w-full p-4 flex items-center gap-3 hover:bg-muted text-left transition-colors"
          >
            <span className="material-symbols-outlined">upload</span>
            <div>
              <p className="text-sm font-bold">Importar JSON</p>
              <p className="text-[10px] text-muted-foreground">Restaura a partir de um backup</p>
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </section>

      {/* Danger zone */}
      <section className="text-center">
        <button
          onClick={() => {
            if (!window.confirm('Apagar TODOS os dados? Isso não pode ser desfeito.')) return;
            tracker.events.forEach((e) => tracker.removeEvent(e.id));
            toast.success('Todos os dados apagados');
          }}
          className="text-destructive font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 mx-auto hover:underline px-4 py-2 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">delete_forever</span>
          Limpar todos os dados
        </button>
      </section>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/GoalsContent.tsx
git commit -m "feat(ui): GoalsContent neobrutalism (slider brutal, lista sem rounded)"
```

---

### Task 19: Ajustar `EditDayDialog.tsx`

A maior parte herda do `dialog.tsx` e `button.tsx` novos. Só os items da lista usam classes inline com `border bg-card rounded-lg hover:bg-accent/50` + iconBg HSL com secondary (que agora é branco). Trocar por estilo brutal.

**Files:**
- Modify: `src/components/EditDayDialog.tsx` (linhas 79-126 — bloco do map)

- [ ] **Step 1: Substituir as linhas 79-126 (bloco `<div className="max-h-[50vh]...">`)**

Localizar o bloco:

```tsx
        <div className="max-h-[50vh] overflow-y-auto space-y-2 py-2">
          {sorted.map((ev) => {
            const Icon = ev.type === 'tobacco' ? Cigarette : Leaf;
            const time = format(parseISO(ev.timestamp), 'HH:mm');
            const iconBg = ev.type === 'tobacco'
              ? 'hsl(var(--secondary) / 0.15)'
              : 'hsl(var(--primary) / 0.15)';
            const context = [ev.location, ev.reason].filter(Boolean).join(' · ');

            return (
              <div
                key={ev.id}
                onClick={() => setEditingEvent(ev)}
                className="flex items-center gap-3 p-3.5 rounded-lg border bg-card cursor-pointer hover:bg-accent/50 active:scale-[0.98] transition-all duration-100"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: iconBg }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{time}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {context || <span className="text-muted-foreground/50">sem contexto</span>}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveEvent(ev.id);
                    toast('Evento removido', {
                      duration: 5000,
                      action: {
                        label: 'Desfazer',
                        onClick: () => onUndo(),
                      },
                    });
                  }}
                  aria-label="Remover evento"
                  className="p-2 rounded-md text-muted-foreground hover:bg-destructive/15 hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
              </div>
            );
          })}
        </div>
```

Substituir por:

```tsx
        <div className="max-h-[50vh] overflow-y-auto space-y-2 py-2">
          {sorted.map((ev) => {
            const Icon = ev.type === 'tobacco' ? Cigarette : Leaf;
            const time = format(parseISO(ev.timestamp), 'HH:mm');
            const context = [ev.location, ev.reason].filter(Boolean).join(' · ');

            return (
              <div
                key={ev.id}
                onClick={() => setEditingEvent(ev)}
                className="flex items-center gap-3 p-3 border-2 border-border bg-card cursor-pointer hover:bg-muted active:translate-x-[1px] active:translate-y-[1px] transition-transform"
              >
                <div className="w-9 h-9 border-2 border-border bg-primary flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold">{time}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {context || <span className="text-muted-foreground/60">sem contexto</span>}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveEvent(ev.id);
                    toast('Evento removido', {
                      duration: 5000,
                      action: {
                        label: 'Desfazer',
                        onClick: () => onUndo(),
                      },
                    });
                  }}
                  aria-label="Remover evento"
                  className="p-2 text-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </div>
            );
          })}
        </div>
```

Mudanças: removido `iconBg` HSL (secondary virou branco, ficava invisível); ícone agora em fundo amarelo padrão; rounded → border 2; hover passa a usar `bg-muted` e o press é translate.

- [ ] **Step 2: Verificar build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/components/EditDayDialog.tsx
git commit -m "feat(ui): EditDayDialog lista de eventos brutal"
```

---

## Fase 4 — Páginas (`src/pages/*`) e App

### Task 20: Reescrever `src/pages/TrackerPage.tsx`

**Files:**
- Modify: `src/pages/TrackerPage.tsx`

- [ ] **Step 1: Substituir o arquivo**

```tsx
import { format, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EventType } from '@/types';
import { UseTrackerAPI } from '@/hooks/useTracker';
import { getDaysInRange, todayKey } from '@/lib/events';

interface TrackerPageProps {
  tracker: UseTrackerAPI;
  onOpenNewEvent: (type: EventType) => void;
}

export const TrackerPage = ({ tracker, onOpenNewEvent }: TrackerPageProps) => {
  const totals = tracker.getTodayTotals();
  const todayTotal = totals.tobacco + totals.cannabis;
  const currentGoal = tracker.getCurrentGoal();
  const streak = tracker.getCurrentStreak();

  const today = new Date();
  const weekDays = getDaysInRange(subDays(today, 6), today);
  const weekTotals = weekDays.map((d) => {
    const t = tracker.getDayTotals(d);
    return { dayKey: d, total: t.tobacco + t.cannabis, tobacco: t.tobacco, cannabis: t.cannabis };
  });
  const maxTotal = Math.max(1, ...weekTotals.map((w) => w.total));

  const todayStr = todayKey();
  const todayNoon = parseISO(todayStr + 'T12:00:00');
  const recentDays = [todayStr, format(subDays(todayNoon, 1), 'yyyy-MM-dd'), format(subDays(todayNoon, 2), 'yyyy-MM-dd')];
  const recentGroups = recentDays
    .map((dayKey, idx) => {
      const events = tracker
        .getEventsForDay(dayKey)
        .slice()
        .sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1));
      const heading =
        idx === 0
          ? 'Hoje'
          : idx === 1
          ? 'Ontem'
          : format(parseISO(dayKey + 'T00:00:00'), 'dd/MM', { locale: ptBR });
      return { dayKey, events, heading };
    })
    .filter((g) => g.events.length > 0);

  return (
    <>
      {/* Mobile layout */}
      <main className="flex-1 px-6 pt-24 pb-32 overflow-y-auto md:hidden">
        {/* Quick Log */}
        <section className="mb-8 space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider">
            Quick Log
          </p>
          <div className="grid grid-cols-2 gap-4">
            {(['tobacco', 'cannabis'] as EventType[]).map((type) => {
              const isTobacco = type === 'tobacco';
              return (
                <button
                  key={type}
                  onClick={() => onOpenNewEvent(type)}
                  className="flex flex-col items-center justify-center gap-3 bg-card border-2 border-border shadow-brutal p-6 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-transform"
                >
                  <span className="material-symbols-outlined text-4xl">
                    {isTobacco ? 'smoke_free' : 'potted_plant'}
                  </span>
                  <span className="text-[10px] font-bold tracking-wider uppercase">
                    {isTobacco ? 'Tabaco' : 'Cannabis'}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Hero Streak */}
        {currentGoal && streak > 0 && (
          <section className="mb-8">
            <div className="flex flex-col items-start">
              <span className="text-xs font-bold uppercase tracking-wider mb-1">
                Streak Atual
              </span>
              <div className="flex items-baseline gap-2">
                <h2 className="text-5xl font-bold tracking-tight">{streak}</h2>
                <span className="text-xl font-semibold text-muted-foreground">dias</span>
              </div>
            </div>
          </section>
        )}

        {/* Bento Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Today's Consumption */}
          <div className="col-span-2 bg-card text-foreground border-2 border-border shadow-brutal p-6">
            <p className="text-xs font-bold uppercase tracking-wider mb-4">
              Consumo de Hoje
            </p>
            <div className="flex justify-between items-end">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wider mb-1">Tabaco</p>
                  <p className="text-3xl font-bold">{totals.tobacco}</p>
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-wider mb-1">Cannabis</p>
                  <p className="text-3xl font-bold">{totals.cannabis}</p>
                </div>
              </div>
              {currentGoal && (
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider font-bold mb-1">
                    Meta Diária
                  </p>
                  <div className="flex items-baseline justify-end gap-1">
                    <span className="text-4xl font-bold">{todayTotal}</span>
                    <span className="text-xl font-semibold text-muted-foreground">
                      / {currentGoal.limit}
                    </span>
                  </div>
                </div>
              )}
            </div>
            {currentGoal && (
              <div className="mt-6 h-3 w-full bg-muted border-2 border-border overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${Math.min(100, (todayTotal / currentGoal.limit) * 100)}%` }}
                />
              </div>
            )}
          </div>

          {/* Last 7 Days mini chart */}
          <div className="col-span-2 bg-card border-2 border-border shadow-brutal p-5">
            <p className="text-xs font-bold uppercase tracking-wider mb-6">
              Últimos 7 Dias
            </p>
            <div className="h-24 flex items-end justify-between gap-1">
              {weekTotals.map(({ dayKey, total, tobacco, cannabis }) => {
                const heightPct = total > 0 ? Math.max(5, (total / maxTotal) * 100) : 3;
                const bg =
                  cannabis > tobacco ? 'bg-foreground' : tobacco > 0 ? 'bg-primary' : 'bg-muted';
                return (
                  <div
                    key={dayKey}
                    className={`w-full border-2 border-border ${bg}`}
                    style={{ height: `${heightPct}%` }}
                  />
                );
              })}
            </div>
            <div className="flex justify-between mt-2">
              {weekTotals.map(({ dayKey }) => (
                <span key={dayKey} className="text-[8px] uppercase font-bold text-muted-foreground">
                  {format(parseISO(dayKey + 'T00:00:00'), 'EEE', { locale: ptBR })
                    .slice(0, 1)
                    .toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Desktop layout — recent logs */}
      <main className="hidden md:flex flex-col px-8 pt-24 pb-8 ml-80 min-h-screen">
        <h2 className="text-xs font-bold uppercase tracking-wider mb-6">
          Logs Recentes
        </h2>
        {recentGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum registro nos últimos 3 dias.</p>
        ) : (
          <div className="space-y-8">
            {recentGroups.map(({ dayKey, events, heading }) => (
              <section key={dayKey}>
                <p className="text-xs font-bold uppercase tracking-wider mb-3">
                  {heading}
                </p>
                <div className="space-y-2">
                  {events.map((event) => {
                    const isCannabis = event.type === 'cannabis';
                    return (
                      <div
                        key={event.id}
                        className="bg-card border-2 border-border p-4 flex items-center gap-4"
                      >
                        <div className="w-9 h-9 border-2 border-border bg-primary flex items-center justify-center flex-shrink-0">
                          <span className="material-symbols-outlined text-base">
                            {isCannabis ? 'eco' : 'smoking_rooms'}
                          </span>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                            {format(parseISO(event.timestamp), 'HH:mm', { locale: ptBR })}
                          </p>
                          <p className="text-sm font-bold">
                            {isCannabis ? 'Cannabis' : 'Tabaco'}
                          </p>
                          {event.location && (
                            <p className="text-[11px] text-muted-foreground">{event.location}</p>
                          )}
                          {event.reason && (
                            <p className="text-[11px] text-muted-foreground">{event.reason}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </>
  );
};
```

- [ ] **Step 2: Verificar build**

```bash
npm run build
```

Expected: passa.

- [ ] **Step 3: Commit**

```bash
git add src/pages/TrackerPage.tsx
git commit -m "feat(ui): TrackerPage neobrutalism (remove tokens legados)"
```

---

### Task 21: Reescrever `src/pages/HistoryPage.tsx`

**Files:**
- Modify: `src/pages/HistoryPage.tsx`

- [ ] **Step 1: Substituir o arquivo**

```tsx
import { useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, subDays, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { UseTrackerAPI } from '@/hooks/useTracker';
import { getDaysInRange, getEarliestEventMonth, getMonthKey, todayKey } from '@/lib/events';
import { MonthlyChart } from '@/components/MonthlyChart';
import { DayCell, MonthNavigation } from '@/components/CalendarView';

interface HistoryPageProps {
  tracker: UseTrackerAPI;
  onOpenEditDay: (dayKey: string) => void;
}

const WEEK_HEADER = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

export const HistoryPage = ({ tracker, onOpenEditDay }: HistoryPageProps) => {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(today));

  const earliest = useMemo(() => getEarliestEventMonth(tracker.events), [tracker.events]);
  const currentMonthKey = getMonthKey(today);
  const viewMonthKey = getMonthKey(viewMonth);

  const canGoBack = earliest !== null && viewMonth > earliest;
  const canGoForward = viewMonthKey !== currentMonthKey;

  const monthLabel = format(viewMonth, 'MMMM yyyy', { locale: ptBR });
  const monthDays = getDaysInRange(startOfMonth(viewMonth), endOfMonth(viewMonth));

  const streak = tracker.getCurrentStreak();
  const currentGoal = tracker.getCurrentGoal();
  const avg7d = tracker.getRollingAverage(7);
  const delta7d = tracker.getAverageDelta(7);

  const weekDays = getDaysInRange(subDays(today, 6), today);
  const weekTotal = weekDays.reduce((sum, d) => {
    const t = tracker.getDayTotals(d);
    return sum + t.tobacco + t.cannabis;
  }, 0);

  const todayStr = todayKey();

  return (
    <main className="flex-1 px-6 pt-24 pb-32 overflow-y-auto md:pt-24 md:pl-8 md:pr-8 md:ml-80">
      {/* Hero stat */}
      <section className="mb-8">
        <div className="flex items-end gap-2 mb-1">
          <span className="text-[3.5rem] font-bold tracking-tight leading-none">
            {currentGoal ? streak : '—'}
          </span>
          <span className="text-xs font-bold uppercase tracking-wider mb-2">
            {currentGoal ? 'dias na meta' : 'sem meta'}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {!currentGoal
            ? 'Defina uma meta em Goals para acompanhar seu progresso.'
            : streak === 0
            ? 'Nenhum dia consecutivo ainda.'
            : `${streak} dia${streak !== 1 ? 's' : ''} consecutivo${streak !== 1 ? 's' : ''} dentro da meta.`}
        </p>
      </section>

      {/* Weekly bento */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-card border-2 border-border shadow-brutal p-5">
          <span className="text-xs font-bold uppercase tracking-wider block mb-4">
            Esta semana
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{weekTotal}</span>
            <span className="text-xs text-muted-foreground">unidades</span>
          </div>
          {delta7d !== null && (
            <div className="mt-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                {delta7d <= 0 ? 'trending_down' : 'trending_up'}
              </span>
              <span>{Math.abs(delta7d * 100).toFixed(0)}% vs semana passada</span>
            </div>
          )}
        </div>
        <div className="bg-card border-2 border-border shadow-brutal p-5">
          <span className="text-xs font-bold uppercase tracking-wider block mb-4">
            Média 7d
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{avg7d.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">por dia</span>
          </div>
        </div>
      </div>

      {/* Monthly chart */}
      <section className="mb-8 bg-card border-2 border-border shadow-brutal p-6">
        <div className="mb-4">
          <MonthNavigation
            label={monthLabel}
            canGoBack={canGoBack}
            canGoForward={canGoForward}
            onBack={() => setViewMonth((m) => subMonths(m, 1))}
            onForward={() => setViewMonth((m) => addMonths(m, 1))}
          />
        </div>
        <MonthlyChart
          dayKeys={monthDays}
          getDayTotals={tracker.getDayTotals}
          onDayClick={onOpenEditDay}
          events={tracker.events}
          goalLimit={currentGoal?.limit ?? null}
          className="h-[200px]"
        />
      </section>

      {/* Calendar grid */}
      <section className="mb-8">
        <h2 className="text-xs font-bold uppercase tracking-wider mb-4">
          Calendário
        </h2>
        <div className="bg-card border-2 border-border shadow-brutal p-4">
          <div className="grid grid-cols-7 gap-2 mb-2">
            {WEEK_HEADER.map((d, i) => (
              <span key={i} className="text-[10px] text-center font-bold uppercase tracking-wider">
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((dayKey) => (
              <DayCell
                key={dayKey}
                dayKey={dayKey}
                getDayTotals={tracker.getDayTotals}
                getDayGoalStatus={tracker.getDayGoalStatus}
                onDayClick={onOpenEditDay}
                todayStr={todayStr}
              />
            ))}
          </div>
        </div>
      </section>

    </main>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/HistoryPage.tsx
git commit -m "feat(ui): HistoryPage neobrutalism (remove tokens legados)"
```

---

### Task 22: Atualizar header mobile do `App.tsx`

**Files:**
- Modify: `src/App.tsx` (linhas 42-52, bloco do `<header className="md:hidden ...">`)

- [ ] **Step 1: Substituir o bloco do header mobile**

Localizar:

```tsx
      {/* Mobile header */}
      <header className="md:hidden fixed top-0 w-full z-50 bg-background flex justify-between items-center px-6 h-16 border-b border-outline-variant/10">
        <span className="text-primary font-black tracking-tighter text-xl">Smoking Tracker</span>
        <button
          onClick={() => setTab('goals')}
          aria-label="Configurações"
          className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors active:scale-95"
        >
          <span className="material-symbols-outlined">settings</span>
        </button>
      </header>
```

Substituir por:

```tsx
      {/* Mobile header */}
      <header className="md:hidden fixed top-0 w-full z-50 bg-card flex justify-between items-center px-6 h-16 border-b-2 border-border">
        <span className="text-foreground font-bold tracking-tight text-xl">Smoking Tracker</span>
        <button
          onClick={() => setTab('goals')}
          aria-label="Configurações"
          className="p-2 text-foreground hover:bg-muted transition-colors"
        >
          <span className="material-symbols-outlined">settings</span>
        </button>
      </header>
```

- [ ] **Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "feat(ui): mobile header brutal"
```

---

## Fase 5 — Testes e verificação final

### Task 23: Atualizar `BottomNav.test.tsx`

A aba ativa agora usa `bg-primary text-primary-foreground` em vez de `text-primary`. Inverter a asserção.

**Files:**
- Modify: `src/components/BottomNav.test.tsx`

- [ ] **Step 1: Substituir o teste de "applies primary color class"**

Localizar:

```tsx
  it('applies primary color class to the active tab only', () => {
    render(<BottomNav tab="history" onChange={() => {}} />);
    const historyBtn = screen.getByRole('button', { name: /history/i });
    const trackerBtn = screen.getByRole('button', { name: /tracker/i });
    expect(historyBtn.className).toContain('text-primary');
    expect(trackerBtn.className).not.toContain('text-primary');
  });
```

Substituir por:

```tsx
  it('applies primary background class to the active tab only', () => {
    render(<BottomNav tab="history" onChange={() => {}} />);
    const historyBtn = screen.getByRole('button', { name: /history/i });
    const trackerBtn = screen.getByRole('button', { name: /tracker/i });
    expect(historyBtn.className).toContain('bg-primary');
    expect(trackerBtn.className).not.toContain('bg-primary');
  });
```

- [ ] **Step 2: Rodar os testes**

```bash
npm run test:run
```

Expected: todos os testes (`App.test.tsx` + `BottomNav.test.tsx` + `GoalsPage.test.tsx`) passam.

- [ ] **Step 3: Commit**

```bash
git add src/components/BottomNav.test.tsx
git commit -m "test: atualiza asserção da aba ativa (bg-primary)"
```

---

### Task 24: Verificação final (build + tests + manual)

- [ ] **Step 1: Build de produção**

```bash
npm run build
```

Expected: completa sem warnings novos; bundle gerado em `dist/`.

- [ ] **Step 2: Lint**

```bash
npm run lint
```

Expected: sem novos erros (warnings que já existiam continuam, mas nada introduzido pelo redesign).

- [ ] **Step 3: Testes**

```bash
npm run test:run
```

Expected: todos passam.

- [ ] **Step 4: Validação visual com dev server**

Subir `npm run dev` e verificar em browser:

- Fundo Parchment (#F5EFDF) visível em todas as páginas
- Cards brancos com borda preta 2px + sombra brutal 3px
- Cantos retos em tudo
- Apenas preto + amarelo (#FFD23F) como cores — sem verde, laranja, coral, gradientes
- Fonte Space Grotesk em uso (números grandes pesados)
- Press de botões: sombra colapsa + translate visível
- Páginas: Tracker, History, Goals
- Componentes: abrir NewEventDrawer, EditDayDialog, EditEventDrawer, tooltips se houver
- Bottom nav (mobile <md): item ativo amarelo
- Desktop sidebar e top nav (largura >=md)
- Calendário: cores by goal-status (verde-meta → amarelo, over → preto, sem-meta → branco)
- Chart mensal: barras pretas, linha amarela horizontal na meta

Não há critério "pass/fail" automatizado para o visual — checagem é por inspeção. Se algo não bateu, abrir uma issue/task incremental.

- [ ] **Step 5: Commit final (se ajustes finos foram necessários)**

```bash
git add -A
git commit -m "feat: ajustes finos pós-verificação visual"
```

(Se nenhum ajuste, pular.)

---

### Task 25: Cleanup dos tokens compat

Após todas as migrações, nenhum arquivo deve mais referenciar `surface-container-*`, `on-surface*`, `outline-variant`, `on-primary` ou `primary-container`. Esta task remove os compat de `src/index.css` e `tailwind.config.ts`.

**Files:**
- Modify: `src/index.css`
- Modify: `tailwind.config.ts`

- [ ] **Step 1: Confirmar que não há mais referências**

```bash
grep -rn "surface-container\|on-surface\|on-primary\|outline-variant\|primary-container" src --include="*.tsx" --include="*.ts"
```

Expected: zero linhas. Se houver, voltar e migrar antes de continuar esta task.

- [ ] **Step 2: Remover o bloco "Compat" de `src/index.css`**

Apagar as linhas dentro do bloco `:root` que começam com `/* Compat ... */` até `--outline-variant`:

```css
    /* Compat (legacy tokens used em pages/components até serem migrados; removidos na Task 25) */
    --surface-container-lowest:  0  0% 100%;
    --surface-container-low:     0  0% 100%;
    --surface-container:         0  0% 100%;
    --surface-container-high:   42 30% 88%;
    --surface-container-highest:42 30% 88%;
    --on-surface:                0  0%  7%;
    --on-surface-variant:        0  0% 40%;
    --on-primary:                0  0%  7%;
    --outline-variant:           0  0%  7%;
```

- [ ] **Step 3: Remover o bloco "Compat" de `tailwind.config.ts`**

Apagar as linhas dentro de `colors:` que começam com `/* Compat — removidos na Task 25 */` até a vírgula final do `'outline-variant'`:

```ts
        /* Compat — removidos na Task 25 */
        'surface-container-lowest': 'hsl(var(--surface-container-lowest))',
        'surface-container-low':    'hsl(var(--surface-container-low))',
        'surface-container':        'hsl(var(--surface-container))',
        'surface-container-high':   'hsl(var(--surface-container-high))',
        'surface-container-highest':'hsl(var(--surface-container-highest))',
        'on-surface':               'hsl(var(--on-surface))',
        'on-surface-variant':       'hsl(var(--on-surface-variant))',
        'on-primary':               'hsl(var(--on-primary))',
        'outline-variant':          'hsl(var(--outline-variant))',
```

- [ ] **Step 4: Build final**

```bash
npm run build && npm run test:run
```

Expected: ambos passam. Se um `bg-surface-container-low` esquecido aparecer, o build não dá erro (Tailwind ignora silenciosamente) — só uma inspeção visual revelaria. Por isso o Step 1 com `grep` é o gate real.

- [ ] **Step 5: Commit**

```bash
git add src/index.css tailwind.config.ts
git commit -m "chore(theme): remove tokens compat legados"
```

---

## Critérios de aceite finais

- [ ] `npm run build` passa
- [ ] `npm run lint` passa
- [ ] `npm run test:run` todos verdes
- [ ] App em modo light sobre fundo Parchment
- [ ] Apenas preto + amarelo + branco + vermelho-destructive como cores
- [ ] Cantos retos universais (radius 0)
- [ ] Borda 2px + sombra brutal em todos os elementos elevados
- [ ] Fonte Space Grotesk em uso
- [ ] `next-themes` removido de `package.json`
- [ ] `NavLink.tsx` removido
- [ ] Todas as referências a `surface-container-*`/`on-surface*`/`outline-variant` foram eliminadas (`grep` retorna zero)
