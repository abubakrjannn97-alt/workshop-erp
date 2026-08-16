import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";

type Props = {
  label: string;
  variant?: "icon" | "button";
  className?: string;
};

export function LogoutButton({ label, variant = "button", className }: Props) {
  if (variant === "icon") {
    return (
      <form action={logoutAction} className={className}>
        <button
          type="submit"
          title={label}
          aria-label={label}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut size={18} strokeWidth={1.8} />
        </button>
      </form>
    );
  }

  return (
    <form action={logoutAction} className={className}>
      <button type="submit" className="ui-btn-danger w-full">
        {label}
      </button>
    </form>
  );
}
