import { NavLink as RouterNavLink, useNavigate } from "react-router-dom";
import { forwardRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { withViewTransition } from "@/lib/view-transition";

const NavLink = forwardRef(
  (
    {
      className,
      activeClassName,
      pendingClassName,
      to,
      onClick,
      children,
      ...props
    },
    ref,
  ) => {
    const navigate = useNavigate();

    // Intercept the click so we can wrap the route change in a view
    // transition. Mouse-button checks mirror react-router's own <Link>:
    // we let modified clicks (cmd/ctrl/shift/alt or non-primary) fall
    // through to the browser so "open in new tab" still works.
    const handleClick = useCallback(
      (event) => {
        if (typeof onClick === 'function') onClick(event);
        if (event.defaultPrevented) return;
        if (event.button !== 0) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const target = event.currentTarget?.getAttribute?.('target');
        if (target && target !== '_self') return;
        if (typeof to !== 'string') return;

        event.preventDefault();
        withViewTransition(() => {
          navigate(to);
        });
      },
      [navigate, onClick, to],
    );

    return (
      <RouterNavLink
        ref={ref}
        to={to}
        onClick={handleClick}
        // Mirror react-router's NavLink: allow either a string (with optional
        // `activeClassName` / `pendingClassName`) OR a function that receives
        // `{ isActive, isPending }` — needed by call sites that want to
        // toggle multiple branches per state.
        className={({ isActive, isPending }) => {
          if (typeof className === 'function') {
            return className({ isActive, isPending });
          }
          return cn(
            className,
            isActive && activeClassName,
            isPending && pendingClassName,
          );
        }}
        {...props}
      >
        {/* Render-prop children: matches the standard react-router pattern
            so callers like MobileNav can switch icon weight/colour with the
            same `{ isActive }` signature. */}
        {typeof children === 'function'
          ? ({ isActive, isPending }) => children({ isActive, isPending })
          : children}
      </RouterNavLink>
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };