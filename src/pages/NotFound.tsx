import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ComingSoon } from "@/components/common/ComingSoon";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <ComingSoon 
      title="Sección no disponible" 
      description="La página que buscas no existe o aún no está disponible."
    />
  );
};

export default NotFound;
