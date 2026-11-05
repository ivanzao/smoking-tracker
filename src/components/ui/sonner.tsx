import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      // Clear of the bottom nav, which the toast would otherwise block
      offset={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
      mobileOffset={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-2 group-[.toaster]:border-border group-[.toaster]:shadow-brutal group-[.toaster]:rounded-none",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:!h-11 group-[.toast]:!bg-primary group-[.toast]:!text-primary-foreground group-[.toast]:border-2 group-[.toast]:border-border group-[.toast]:!rounded-none",
          cancelButton:
            "group-[.toast]:!h-11 group-[.toast]:!bg-card group-[.toast]:!text-foreground group-[.toast]:border-2 group-[.toast]:border-border group-[.toast]:!rounded-none",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
