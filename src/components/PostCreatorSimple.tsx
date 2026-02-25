import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Image, Video, FileText, Lightbulb, FolderKanban } from "lucide-react";
import { uploadMediaFile, getMediaType } from "@/lib/api/posts/storage";
import { useQueryClient } from "@tanstack/react-query";

interface PostCreatorSimpleProps {
  onPostCreated?: () => void;
}

export function PostCreatorSimple({ onPostCreated }: PostCreatorSimpleProps) {
  const [content, setContent] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [postType, setPostType] = useState<'regular' | 'idea' | 'project'>('regular');
  const [isUploading, setIsUploading] = useState(false);
  const [backgroundKey, setBackgroundKey] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSubmit = async () => {
    if (!content.trim() && selectedFiles.length === 0 && !backgroundKey) {
      toast({ variant: "destructive", title: "Error", description: "Escribe algo o adjunta un archivo" });
      return;
    }

    setIsUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({ variant: "destructive", title: "Error", description: "Inicia sesión primero" });
        return;
      }

      const mediaUrls: string[] = [];
      let mediaType: 'image' | 'video' | 'audio' | null = null;

      if (selectedFiles.length > 0) {
        for (const f of selectedFiles) {
          try {
            const url = await uploadMediaFile(f);
            if (url) mediaUrls.push(url);
            if (!mediaType) mediaType = getMediaType(f);
          } catch (err) {
            console.warn('Upload failed for file', f.name, err);
          }
        }
      }

      const postData: any = {
        user_id: session.user.id,
        content: content.trim() || null,
        visibility: 'public',
        post_type: postType
      };

      if (mediaUrls.length > 0) {
        postData.media_urls = mediaUrls;
      }

      if (mediaType) postData.media_type = mediaType;

      if (backgroundKey) {
        postData.content_style = {
          backgroundKey: backgroundKey,
          textColor: 'white',
          isTextOnly: true
        };
      }

      const { error } = await supabase.from('posts').insert(postData);

      if (error) throw error;

      toast({ title: "¡Publicado!", description: "Tu publicación se creó correctamente" });
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      if (postType === "idea") {
        queryClient.invalidateQueries({ queryKey: ["ideas"] });
      }
      
      setContent("");
      setSelectedFiles([]);
      setPostType('regular');
      onPostCreated?.();
    } catch (error) {
      console.error('Error:', error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo publicar" });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="p-4 space-y-4">
      {/* Selector de tipo */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={postType === 'regular' ? 'default' : 'outline'}
          onClick={() => setPostType('regular')}
        >
          Regular
        </Button>
        <Button
          size="sm"
          variant={postType === 'idea' ? 'default' : 'outline'}
          onClick={() => setPostType('idea')}
        >
          <Lightbulb className="h-4 w-4 mr-1" />
          Idea
        </Button>
        <Button
          size="sm"
          variant={postType === 'project' ? 'default' : 'outline'}
          onClick={() => setPostType('project')}
        >
          <FolderKanban className="h-4 w-4 mr-1" />
          Proyecto
        </Button>
      </div>

      {/* Área de texto */}
      <Textarea
        placeholder={`¿Qué estás pensando?${postType === 'idea' ? ' Comparte tu idea...' : postType === 'project' ? ' Describe tu proyecto...' : ''}`}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="min-h-[120px] resize-none"
      />

      {/* Adjuntos */}
      <div className="space-y-2">
        {/* Background presets */}
        <div className="flex items-center gap-2">
          {[
            { key: 'bg-grad-1', color: 'bg-gradient-to-r from-purple-500 to-pink-500' },
            { key: 'bg-grad-2', color: 'bg-gradient-to-r from-blue-500 to-cyan-500' },
            { key: 'bg-grad-3', color: 'bg-gradient-to-r from-green-400 to-emerald-500' },
            { key: 'bg-solid-1', color: 'bg-black' },
            { key: 'bg-solid-2', color: 'bg-white' }
          ].map((bg) => (
            <button
              key={bg.key}
              onClick={() => setBackgroundKey(backgroundKey === bg.key ? null : bg.key)}
              className={`${bg.color} h-8 w-12 rounded-md border ${backgroundKey === bg.key ? 'ring-2 ring-offset-2 ring-primary' : ''}`}
              aria-label={bg.key}
            />
          ))}
        </div>

        <div>
          <input
            type="file"
            id="file-upload"
            className=""
            accept="image/*,video/*,.pdf,.doc,.docx"
            multiple
            onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
          />
          {selectedFiles.length > 0 && (
            <div className="text-sm text-muted-foreground mt-2">
              {selectedFiles.map(f => (<div key={f.name}>{f.name}</div>))}
            </div>
          )}
        </div>
      </div>

      {/* Botón publicar */}
      <Button
        onClick={handleSubmit}
        disabled={isUploading || (!content.trim() && !selectedFile)}
        className="w-full"
      >
        {isUploading ? "Publicando..." : "Publicar"}
      </Button>
    </Card>
  );
}
