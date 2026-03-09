import { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
  hideNavigation?: boolean;
  hideLeftSidebar?: boolean;
  hideRightSidebar?: boolean;
}

export function Layout({ 
  children, 
  hideNavigation = false, 
  hideLeftSidebar = false, 
  hideRightSidebar = false 
}: LayoutProps) {
  void hideNavigation;
  void hideLeftSidebar;
  void hideRightSidebar;

  return <>{children}</>;
}
