import { AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormValidationMessageProps {
  type: "error" | "success" | "warning" | "info";
  message: string;
  className?: string;
  icon?: boolean;
}

export function FormValidationMessage({ 
  type, 
  message, 
  className,
  icon = true 
}: FormValidationMessageProps) {
  const getIcon = () => {
    if (!icon) return null;
    
    switch (type) {
      case "error":
        return <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-primary flex-shrink-0" />;
      case "info":
        return <AlertCircle className="h-4 w-4 text-primary flex-shrink-0" />;
      default:
        return null;
    }
  };

  const getStyles = () => {
    switch (type) {
      case "error":
        return "text-destructive bg-destructive/10 border-destructive/20";
      case "success":
        return "text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950 dark:border-green-800";
      case "warning":
        return "text-yellow-700 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-950 dark:border-yellow-800";
      case "info":
        return "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950 dark:border-blue-800";
      default:
        return "";
    }
  };

  return (
    <div className={cn(
      "flex items-center gap-2 p-3 rounded-md border text-sm",
      getStyles(),
      className
    )}>
      {getIcon()}
      <span className="flex-1">{message}</span>
    </div>
  );
}

// Mobile-optimized validation helpers
export const MobileValidationHelpers = {
  showError: (message: string) => (
    <FormValidationMessage 
      type="error" 
      message={message}
      className="mt-2 animate-in slide-in-from-top-1 duration-300"
    />
  ),
  
  showSuccess: (message: string) => (
    <FormValidationMessage 
      type="success" 
      message={message}
      className="mt-2 animate-in slide-in-from-top-1 duration-300"
    />
  ),
  
  showWarning: (message: string) => (
    <FormValidationMessage 
      type="warning" 
      message={message}
      className="mt-2 animate-in slide-in-from-top-1 duration-300"
    />
  ),
  
  inlineError: (message: string) => (
    <FormValidationMessage 
      type="error" 
      message={message}
      icon={false}
      className="mt-1 p-2 text-xs"
    />
  )
};