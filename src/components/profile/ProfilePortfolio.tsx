import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Download, ExternalLink, Plus, Trash2, FileText, Lock, Unlock, Github, Linkedin, Globe, Briefcase } from "lucide-react";
import type { Profile } from "@/pages/Profile";

interface PortfolioLink {
  id: string;
  title: string;
  url: string;
  description?: string;
  type: string;
  created_at: string;
}

interface ProfileCV {
  id: string;
  file_url: string;
  file_name: string;
  upload_date: string;
  is_public: boolean;
}

interface ProfilePortfolioProps {
  profile: Profile;
  isOwner: boolean;
}

export function ProfilePortfolio({ profile, isOwner }: ProfilePortfolioProps) {
  const [cv, setCv] = useState<ProfileCV | null>(null);
  const [portfolioLinks, setPortfolioLinks] = useState<PortfolioLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showAddLink, setShowAddLink] = useState(false);
  const [newLink, setNewLink] = useState({
    title: '',
    url: '',
    description: '',
    type: 'portfolio'
  });
  const { toast } = useToast();

  useEffect(() => {
    if (profile?.id) {
      loadPortfolioData();
    }
  }, [profile?.id]);

  const loadPortfolioData = async () => {
    try {
      const [cvResult, linksResult] = await Promise.all([
        (supabase as any)
          .from('profile_cv')
          .select('*')
          .eq('profile_id', profile.id)
          .single(),
        (supabase as any)
          .from('profile_portfolio_links')
          .select('*')
          .eq('profile_id', profile.id)
          .order('created_at', { ascending: false })
      ]);

      if (cvResult.error && cvResult.error.code !== 'PGRST116') {
        throw cvResult.error;
      }
      if (linksResult.error) throw linksResult.error;

      setCv(cvResult.data);
      setPortfolioLinks(linksResult.data || []);
    } catch (error) {
      console.error('Error loading portfolio data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cargar la información del portafolio"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        variant: "destructive",
        title: "Archivo no válido",
        description: "Solo se permiten archivos PDF, DOC y DOCX"
      });
      return;
    }

    // Validar tamaño (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Archivo muy grande",
        description: "El tamaño máximo permitido es 5MB"
      });
      return;
    }

    setUploading(true);
    try {
      const fileName = `${profile.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('cvs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('cvs')
        .getPublicUrl(fileName);

      const { error: dbError } = await (supabase as any)
        .from('profile_cv')
        .upsert({
          profile_id: profile.id,
          file_url: publicUrl,
          file_name: file.name,
          is_public: false
        });

      if (dbError) throw dbError;

      await loadPortfolioData();
      toast({
        title: "CV subido exitosamente",
        description: "Tu CV ha sido cargado correctamente"
      });
    } catch (error) {
      console.error('Error uploading CV:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo subir el CV"
      });
    } finally {
      setUploading(false);
    }
  };

  const toggleCVVisibility = async () => {
    if (!cv) return;

    try {
      const { error } = await (supabase as any)
        .from('profile_cv')
        .update({ is_public: !cv.is_public })
        .eq('profile_id', profile.id);

      if (error) throw error;

      await loadPortfolioData();
      toast({
        title: cv.is_public ? "CV ahora es privado" : "CV ahora es público",
        description: cv.is_public 
          ? "Solo tú puedes ver tu CV" 
          : "Los reclutadores pueden ver tu CV"
      });
    } catch (error) {
      console.error('Error toggling CV visibility:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cambiar la visibilidad del CV"
      });
    }
  };

  const addPortfolioLink = async () => {
    if (!newLink.title || !newLink.url) {
      toast({
        variant: "destructive",
        title: "Campos requeridos",
        description: "El título y la URL son obligatorios"
      });
      return;
    }

    try {
      const { error } = await (supabase as any)
        .from('profile_portfolio_links')
        .insert({
          profile_id: profile.id,
          title: newLink.title,
          url: newLink.url,
          description: newLink.description,
          type: newLink.type
        });

      if (error) throw error;

      setNewLink({ title: '', url: '', description: '', type: 'portfolio' });
      setShowAddLink(false);
      await loadPortfolioData();
      toast({
        title: "Enlace agregado",
        description: "El enlace se ha agregado a tu portafolio"
      });
    } catch (error) {
      console.error('Error adding portfolio link:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo agregar el enlace"
      });
    }
  };

  const deletePortfolioLink = async (linkId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('profile_portfolio_links')
        .delete()
        .eq('id', linkId);

      if (error) throw error;

      await loadPortfolioData();
      toast({
        title: "Enlace eliminado",
        description: "El enlace se ha eliminado de tu portafolio"
      });
    } catch (error) {
      console.error('Error deleting portfolio link:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el enlace"
      });
    }
  };

  const getLinkIcon = (type: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      github: <Github className="h-4 w-4" />,
      linkedin: <Linkedin className="h-4 w-4" />,
      website: <Globe className="h-4 w-4" />,
      portfolio: <Briefcase className="h-4 w-4" />,
      other: <ExternalLink className="h-4 w-4" />
    };
    return iconMap[type] || iconMap.other;
  };

  const getLinkColor = (type: string) => {
    const colorMap: Record<string, string> = {
      github: "bg-gray-100 text-gray-800 hover:bg-gray-200",
      linkedin: "bg-blue-100 text-blue-800 hover:bg-blue-200",
      website: "bg-green-100 text-green-800 hover:bg-green-200",
      portfolio: "bg-purple-100 text-purple-800 hover:bg-purple-200",
      other: "bg-gray-100 text-gray-800 hover:bg-gray-200"
    };
    return colorMap[type] || colorMap.other;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Portafolio Profesional</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-32 bg-muted rounded animate-pulse" />
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted rounded animate-pulse" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Portafolio Profesional
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* CV Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" />
              CV Profesional
            </h3>
            {isOwner && (
              <div className="flex items-center gap-2">
                <Label htmlFor="cv-upload" className="cursor-pointer">
                  <div className="flex items-center gap-2 px-3 py-1 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90">
                    <Upload className="h-4 w-4" />
                    Subir CV
                  </div>
                </Label>
                <input
                  id="cv-upload"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </div>
            )}
          </div>

          {cv ? (
            <div className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium">{cv.file_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Subido: {new Date(cv.upload_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {cv.is_public ? (
                    <Unlock className="h-4 w-4 text-green-600" />
                  ) : (
                    <Lock className="h-4 w-4 text-gray-600" />
                  )}
                  {isOwner && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleCVVisibility}
                    >
                      {cv.is_public ? 'Hacer Privado' : 'Hacer Público'}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(cv.file_url, '_blank')}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Descargar
                  </Button>
                </div>
              </div>
              {!cv.is_public && (
                <div className="text-sm text-muted-foreground">
                  <Lock className="h-3 w-3 inline mr-1" />
                  Tu CV es privado. Solo tú puedes verlo.
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              {isOwner ? (
                <p>Sube tu CV para que otros puedan verlo</p>
              ) : (
                <p>Este usuario no ha subido su CV</p>
              )}
            </div>
          )}
        </div>

        {/* Portfolio Links Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Enlaces Profesionales
            </h3>
            {isOwner && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddLink(!showAddLink)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Agregar Enlace
              </Button>
            )}
          </div>

          {showAddLink && isOwner && (
            <div className="p-4 border rounded-lg space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="link-title">Título</Label>
                  <Input
                    id="link-title"
                    placeholder="Mi Proyecto Personal"
                    value={newLink.title}
                    onChange={(e) => setNewLink({...newLink, title: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="link-type">Tipo</Label>
                  <Select value={newLink.type} onValueChange={(value) => setNewLink({...newLink, type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="portfolio">Portafolio</SelectItem>
                      <SelectItem value="github">GitHub</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="website">Sitio Web</SelectItem>
                      <SelectItem value="other">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="link-url">URL</Label>
                <Input
                  id="link-url"
                  placeholder="https://..."
                  value={newLink.url}
                  onChange={(e) => setNewLink({...newLink, url: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="link-description">Descripción (opcional)</Label>
                <Textarea
                  id="link-description"
                  placeholder="Descripción de este enlace..."
                  value={newLink.description}
                  onChange={(e) => setNewLink({...newLink, description: e.target.value})}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={addPortfolioLink} disabled={!newLink.title || !newLink.url}>
                  Agregar Enlace
                </Button>
                <Button variant="outline" onClick={() => setShowAddLink(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {portfolioLinks.length > 0 ? (
            <div className="space-y-2">
              {portfolioLinks.map((link) => (
                <div key={link.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-muted">
                      {getLinkIcon(link.type)}
                    </div>
                    <div>
                      <p className="font-medium">{link.title}</p>
                      {link.description && (
                        <p className="text-sm text-muted-foreground">{link.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(link.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getLinkColor(link.type)}>
                      {link.type}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(link.url, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    {isOwner && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deletePortfolioLink(link.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <ExternalLink className="h-12 w-12 mx-auto mb-4 opacity-50" />
              {isOwner ? (
                <p>Agrega enlaces a tus proyectos y redes profesionales</p>
              ) : (
                <p>Este usuario no ha agregado enlaces profesionales</p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
