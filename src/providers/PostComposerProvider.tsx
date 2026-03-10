import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import ModalPublicacionWeb, { type PostType } from "@/components/ModalPublicacionWeb";
import { useAuth } from "@/hooks/use-auth";

type OpenParams = {
  initialPostType?: PostType;
  initialContent?: string;
  initialMedia?: File | null;
  initialMediaType?: string | null;
  userAvatar?: string;
  editingProject?: any;
  editingPost?: any;
};

type PostComposerContextValue = {
  open: (params?: OpenParams) => void;
  close: () => void;
};

const PostComposerContext = createContext<PostComposerContextValue | null>(null);

export function PostComposerProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [params, setParams] = useState<OpenParams>({});

  const open = useCallback((p?: OpenParams) => {
    setParams(p || {});
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setParams({});
  }, []);

  const value = useMemo(() => ({ open, close }), [open, close]);

  const userAvatar = params.userAvatar || (user?.user_metadata as any)?.avatar_url;

  return (
    <PostComposerContext.Provider value={value}>
      {children}
      <ModalPublicacionWeb
        isVisible={isOpen}
        isOpen={isOpen}
        onClose={close}
        userAvatar={userAvatar}
        initialPostType={(params.initialPostType as any) ?? null}
        initialContent={params.initialContent || ""}
        initialMedia={params.initialMedia ?? null}
        initialMediaType={params.initialMediaType ?? null}
        editingProject={params.editingProject}
        editingPost={params.editingPost}
      />
    </PostComposerContext.Provider>
  );
}

export function usePostComposer() {
  const ctx = useContext(PostComposerContext);
  if (!ctx) {
    throw new Error("usePostComposer must be used within PostComposerProvider");
  }
  return ctx;
}
