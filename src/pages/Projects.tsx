import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Layout } from '@/components/layout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { FolderOpen, Plus } from 'lucide-react';
import { usePostComposer } from '@/providers/PostComposerProvider';
import { ProjectGrid } from '@/components/explore/ProjectGrid';

export default function Projects() {
  const { open: openComposer } = usePostComposer();

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <Helmet>
          <title>Proyectos - HIDEON</title>
          <meta name="description" content="Explora proyectos publicados por la comunidad" />
        </Helmet>

        {/* Simple Header */}
        <div className="px-4 py-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center">
                <FolderOpen className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Proyectos</h1>
                <p className="text-sm text-muted-foreground">Explora proyectos de la comunidad</p>
              </div>
            </div>
            <Button
              className="gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-500/95 hover:to-purple-500/95 text-white shadow-lg font-semibold px-6"
              onClick={() => openComposer({ initialPostType: 'proyecto' })}
            >
              <Plus className="h-5 w-5" />
              Publicar proyecto
            </Button>
          </div>
        </div>

        {/* Simple Project Grid */}
        <div className="p-4">
          <ProjectGrid searchQuery="" institutionName="" />
        </div>
      </div>
    </Layout>
  );
}