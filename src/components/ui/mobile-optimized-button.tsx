import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const mobileButtonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 touch-manipulation select-none active:scale-95 transform transition-transform duration-100",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/85",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/85",
        outline:
          "border border-input bg-background/50 hover:bg-muted hover:text-foreground active:bg-muted/80",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/75",
        ghost: "hover:bg-muted hover:text-foreground active:bg-muted/80",
        link: "text-primary underline-offset-4 hover:underline active:text-primary/80",
      },
      size: {
        default: "h-12 px-6 py-3", // Larger default size for mobile
        sm: "h-10 rounded-md px-4 text-sm",
        lg: "h-14 rounded-md px-8 text-base", // Extra large for mobile primary actions
        icon: "h-12 w-12", // Larger touch targets
      },
      touch: {
        default: "",
        large: "min-h-[48px] min-w-[48px]", // Ensure 48px minimum touch target
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      touch: "default",
    },
  }
);

export interface MobileButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof mobileButtonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
}

const MobileButton = React.forwardRef<HTMLButtonElement, MobileButtonProps>(
  ({ className, variant, size, touch, asChild = false, loading, loadingText, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    
    return (
      <Comp
        className={cn(mobileButtonVariants({ variant, size, touch, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
            {loadingText || "Cargando..."}
          </div>
        ) : (
          children
        )}
      </Comp>
    );
  }
);

MobileButton.displayName = "MobileButton";

export { MobileButton, mobileButtonVariants };