import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface HSocialLogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  variant?: "default" | "brand";
}

export const HSocialLogo = ({ className = "", showText = true, size = "md", onClick, variant = "default" }: HSocialLogoProps) => {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  };

  const letterSizeClasses = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-xl",
  };

  const textSizeClasses = {
    sm: "text-base",
    md: "text-xl",
    lg: "text-2xl",
  };

  const logoBgClass = "bg-white dark:bg-[#121212]";
  const logoTextClass = "text-primary";
  const brandWordClass = "text-primary";

  const content = (
    <div className={`flex items-center gap-1.5 group ${className}`}>
      <div className={`${sizeClasses[size]} mt-[1px] rounded-full ${logoBgClass} flex items-center justify-center overflow-hidden`}>
        <svg
          viewBox="700 250 1250 1400"
          className={`w-[92%] h-[92%] fill-current not-italic ${logoTextClass}`}
          aria-hidden="true"
          focusable="false"
        >
          <path
            transform="translate(0 1850) scale(1 -1)"
            d="M820 916 c0 -295 3 -536 6 -536 4 0 78 39 165 87 207 114 207 110 16 211 -21 11 -38 24 -39 28 0 4 74 49 163 100 l164 91 3 -177 2 -178 145 -81 c79 -45 146 -81 149 -81 3 0 6 241 6 535 0 294 -2 535 -4 535 -3 0 -70 -37 -150 -81 l-146 -82 0 -168 c0 -93 -3 -169 -6 -169 -14 0 -393 222 -397 233 -7 18 -5 147 2 147 3 0 35 -17 71 -38 36 -21 91 -52 123 -70 l57 -32 0 42 -1 43 -155 85 c-85 47 -159 87 -164 88 -7 2 -10 -188 -10 -532z m156 -302 c35 -20 64 -38 64 -40 0 -4 -136 -74 -145 -74 -3 0 -5 34 -5 75 0 47 4 75 11 75 6 0 40 -16 75 -36z"
          />
        </svg>
      </div>
      {showText && (
        <span className={`${textSizeClasses[size]} font-extrabold tracking-[0.22em] ${brandWordClass}`}>HIDEON</span>
      )}
    </div>
  );

  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };

    check();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      if (authListener) authListener.subscription.unsubscribe();
    };
  }, []);

  if (onClick) {
    return (
      <button onClick={onClick} className="cursor-pointer">
        {content}
      </button>
    );
  }

  return (
    <Link to={isAuthenticated ? "/home" : "/"} className="cursor-pointer">
      {content}
    </Link>
  );
};
