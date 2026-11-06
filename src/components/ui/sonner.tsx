import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      // Clear of the bottom nav and the log buttons, which the toast would otherwise block
      offset={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
      mobileOffset={{ bottom: 'calc(9rem + env(safe-area-inset-bottom))' }}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-muted group-[.toaster]:text-foreground group-[.toaster]:border-0 group-[.toaster]:shadow-none group-[.toaster]:rounded-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:!h-11 group-[.toast]:!bg-primary group-[.toast]:!text-primary-foreground group-[.toast]:!rounded-md",
          cancelButton:
            "group-[.toast]:!h-11 group-[.toast]:!bg-card group-[.toast]:!text-foreground group-[.toast]:!rounded-md",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
