import * as React from "react";

// Mirrors the `md` screen in tailwind.config.ts
const MOBILE_QUERY = "(max-width: 767px), (max-height: 499px)";

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = () => setIsMobile(mql.matches);
    mql.addEventListener("change", onChange);
    onChange();
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
