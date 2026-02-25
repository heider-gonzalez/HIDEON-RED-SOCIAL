
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Sparkles, Users, Lightbulb, Rocket, MessageCircle, Search } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useState } from "react";
import ModalPublicacionWeb from "@/components/ModalPublicacionWeb";

export function EmptyFeed() {
  const { user } = useAuth();
  const [showPostModal, setShowPostModal] = useState(false);

  const examplePosts = [
    {
      icon: Lightbulb,
      title: "Busco colaborador para app móvil",
      description: "Necesito alguien con experiencia en React Native para un proyecto académico.",
      tags: ["React Native", "Colaboración"]
    },
    {
      icon: Rocket,
      title: "Lancé mi primer proyecto",
      description: "Comparto el link de mi web de recetas saludables construida con Next.js.",
      tags: ["Next.js", "Proyecto"]
    },
    {
      icon: MessageCircle,
      title: "¿Alguien interesado en hackathon?",
      description: "Formamos equipo para el hackathon de la universidad el próximo mes.",
      tags: ["Hackathon", "Equipo"]
    }
  ];

  return (
    <div className="space-y-4">
      {/* Welcome Card */}
      <Card className="p-6 rounded-xl border border-border/60 bg-card shadow-sm">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2">¡Bienvenido a HIDEON!</h2>
            <p className="text-muted-foreground">
              Un lugar para compartir lo que estás construyendo, pedir ayuda y conocer gente con buena energía.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => setShowPostModal(true)} className="gap-2">
              <Rocket className="h-4 w-4" />
              Compartir algo
            </Button>
            <Button variant="outline" className="gap-2">
              <Search className="h-4 w-4" />
              Explorar
            </Button>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="p-4 rounded-xl border border-border/60 bg-card shadow-sm">
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Primeros pasos
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button variant="outline" size="sm" onClick={() => setShowPostModal(true)} className="h-auto p-3 flex flex-col items-start gap-1">
            <Rocket className="h-4 w-4 text-primary" />
            <span className="font-medium">Compartir</span>
            <span className="text-xs text-muted-foreground">Una idea, avance o pregunta</span>
          </Button>
          <Button variant="outline" size="sm" className="h-auto p-3 flex flex-col items-start gap-1">
            <MessageCircle className="h-4 w-4 text-blue-500" />
            <span className="font-medium">Conversar</span>
            <span className="text-xs text-muted-foreground">Responde y acompaña</span>
          </Button>
          <Button variant="outline" size="sm" className="h-auto p-3 flex flex-col items-start gap-1">
            <Users className="h-4 w-4 text-green-500" />
            <span className="font-medium">Conocer gente</span>
            <span className="text-xs text-muted-foreground">Encuentra afinidades</span>
          </Button>
        </div>
      </Card>

      {/* Example Posts */}
      <Card className="p-4 rounded-xl border border-border/60 bg-card shadow-sm">
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          Ideas para inspirarte
        </h3>
        <div className="space-y-3">
          {examplePosts.map((post, i) => {
            const Icon = post.icon;
            return (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border/40 bg-muted/20">
                <Icon className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm mb-1">{post.title}</h4>
                  <p className="text-xs text-muted-foreground mb-2">{post.description}</p>
                  <div className="flex gap-2 flex-wrap">
                    {post.tags.map((tag, j) => (
                      <span key={j} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Post Modal */}
      {showPostModal && (
        <ModalPublicacionWeb
          isVisible={showPostModal}
          isOpen={showPostModal}
          onClose={() => setShowPostModal(false)}
          initialContent=""
          initialMedia={null}
          initialMediaType={null}
        />
      )}
    </div>
  );
}
