import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

const variants = {
  primary: "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.25)] hover:shadow-[0_0_30px_rgba(99,102,241,0.4)]",
  secondary: "bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white",
  ghost: "hover:bg-white/5 text-white/60 hover:text-white",
  danger: "bg-red-500/80 hover:bg-red-500 text-white shadow-sm",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn("inline-flex items-center gap-2 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 focus:ring-offset-transparent", variants[variant], sizes[size], className)}
      {...props}
    />
  )
);
Button.displayName = "Button";
