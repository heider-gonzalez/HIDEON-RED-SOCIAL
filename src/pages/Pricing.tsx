import { FullScreenPageLayout } from "@/components/layout/FullScreenPageLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BadgeCheck,
  BarChart3,
  Briefcase,
  Check,
  CreditCard,
  Crown,
  FileText,
  Flame,
  Globe,
  GraduationCap,
  Lock,
  Pin,
  ShieldCheck,
  Star,
  Users,
  X,
} from "lucide-react";

export default function Pricing() {
  return (
    <FullScreenPageLayout title="Premium Pro">
      <div className="container px-2 sm:px-4 max-w-5xl pt-6 pb-12 space-y-8">
        <Card className="border-border/60 overflow-hidden">
          <CardContent className="p-6 sm:p-10">
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Crown className="h-3.5 w-3.5" />
                  Premium Pro
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Garantía 7 días
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Lock className="h-3.5 w-3.5" />
                  Sin contrato
                </Badge>
              </div>

              <div>
                <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">
                  Desbloquea tu perfil profesional y conviértelo en tu mejor carta de presentación.
                </h1>
                <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-3xl">
                  Premium Pro convierte Hsocial en tu sistema para conseguir colaboradores, destacar en tu universidad y
                  mostrar un portafolio completo: verificación universitaria, CV descargable, proyectos fijados y analytics.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <Button size="lg" className="sm:w-auto" disabled>
                  Premium no disponible
                </Button>
                <Button asChild variant="outline" size="lg" className="sm:w-auto">
                  <a href="#incluye">Ver qué incluye</a>
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                COP $14.900/mes • Pago seguro con MercadoPago • Cancela cuando quieras
              </p>
            </div>
          </CardContent>
        </Card>

        <section aria-label="Comparación Gratis vs Premium" className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold">Comparación clara</h2>
              <p className="text-sm text-muted-foreground">
                Gratis funciona para explorar. Premium Pro desbloquea creación, credibilidad y portafolio.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Gratis</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-2 space-y-3">
                <div className="flex items-start gap-2">
                  <X className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <p className="text-sm">
                    <span className="font-medium">No puedes publicar ideas colaborativas</span> (no puedes buscar roles y armar equipo desde tu
                    idea).
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <X className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <p className="text-sm">
                    <span className="font-medium">No puedes crear y administrar grupos</span> para tu carrera/proyecto.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <X className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <p className="text-sm">
                    <span className="font-medium">0 proyectos fijados</span> (tu mejor trabajo no queda destacado arriba).
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <X className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <p className="text-sm">
                    <span className="font-medium">Sin CV descargable</span> directo desde tu perfil.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <X className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <p className="text-sm">
                    <span className="font-medium">Sin analytics avanzados</span> (no ves quién te visitó ni qué proyecto rinde mejor).
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-gradient-to-b from-primary/10 to-transparent">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  Premium Pro
                  <Badge variant="secondary">Recomendado</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-2 space-y-3">
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 mt-0.5 text-primary" />
                  <p className="text-sm">
                    <span className="font-medium">Ideas colaborativas desbloqueadas</span>: publica tu idea, define roles y arma equipo.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 mt-0.5 text-primary" />
                  <p className="text-sm">
                    <span className="font-medium">Crea y administra grupos</span> para comunidades de carrera, semilleros o proyectos.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 mt-0.5 text-primary" />
                  <p className="text-sm">
                    <span className="font-medium">3 proyectos fijados</span>: tu mejor trabajo queda primero (como vitrina).
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 mt-0.5 text-primary" />
                  <p className="text-sm">
                    <span className="font-medium">CV adjunto y descargable</span> desde tu perfil para reclutadores y coordinadores.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 mt-0.5 text-primary" />
                  <p className="text-sm">
                    <span className="font-medium">Analytics profesionales</span>: visitas, alcance y engagement para mejorar tu contenido.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section id="incluye" aria-label="Beneficios detallados" className="space-y-3">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold">Beneficios que se sienten en resultados</h2>
            <p className="text-sm text-muted-foreground max-w-3xl">
              Premium Pro no es “más features”: es desbloquear credibilidad, portafolio y métricas para tomar mejores decisiones.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-primary" />
                  Certificación y desbloqueo completo
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-2 space-y-4">
                <div className="flex items-start gap-3">
                  <GraduationCap className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Badge verificado universitario</p>
                    <p className="text-sm text-muted-foreground">
                      Verificación con correo institucional: aumenta confianza cuando pides cupos, propones ideas o buscas equipo.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Ideas colaborativas (bloque clave)</p>
                    <p className="text-sm text-muted-foreground">
                      Publica ideas que invitan a colaborar: roles, perfiles y equipo. Dejas de “esperar” y empiezas a construir.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Globe className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Acceso sin restricciones</p>
                    <p className="text-sm text-muted-foreground">
                      Explora y compite con contenido completo, sin bloqueos por funciones esenciales para crecer.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary" />
                  Portafolio profesional completo
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-2 space-y-4">
                <div className="flex items-start gap-3">
                  <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">CV descargable en tu perfil</p>
                    <p className="text-sm text-muted-foreground">
                      Reclutadores y coordinadores pueden ver tu experiencia completa sin salir de Hsocial.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Pin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">3 proyectos fijados</p>
                    <p className="text-sm text-muted-foreground">
                      Abres tu perfil y lo primero que ven es tu mejor trabajo: ideal para prácticas, empleo y alianzas.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Star className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Secciones pro + enlaces</p>
                    <p className="text-sm text-muted-foreground">
                      Certificaciones, premios, experiencia y links (GitHub/LinkedIn/portfolio) para cerrar la duda en segundos.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Analytics profesionales
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-2 space-y-4">
                <div className="flex items-start gap-3">
                  <BarChart3 className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Métricas de proyectos (vistas y alcance)</p>
                    <p className="text-sm text-muted-foreground">
                      Entiendes qué proyecto atrae más interés y dónde optimizar tu presentación.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <BadgeCheck className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Engagement completo</p>
                    <p className="text-sm text-muted-foreground">
                      Reacciones, comentarios y shares para medir impacto real (no solo impresiones).
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Flame className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Aprende qué funciona</p>
                    <p className="text-sm text-muted-foreground">
                      Publicas mejor, más rápido: itera con datos y compite con intención.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Extras que te dan tranquilidad
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-2 space-y-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Garantía de reembolso 7 días</p>
                    <p className="text-sm text-muted-foreground">
                      Prueba Premium Pro sin miedo: si no te sirve, lo cancelas con tranquilidad.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Soporte prioritario (&lt;24h)</p>
                    <p className="text-sm text-muted-foreground">
                      Si estás en una entrega, convocatoria o práctica, no te quedas bloqueado.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <BadgeCheck className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Reconocimiento visible</p>
                    <p className="text-sm text-muted-foreground">
                      El badge verificado agrega contexto y confianza en chats, grupos y colaboraciones.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section aria-label="Casos de uso" className="space-y-3">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold">Casos reales: problema → solución</h2>
            <p className="text-sm text-muted-foreground">Tres escenarios donde Premium Pro se paga solo.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-border/60">
              <CardContent className="p-6 space-y-2">
                <p className="text-sm font-semibold">Si buscas prácticas o trabajo</p>
                <p className="text-sm text-muted-foreground">
                  Premium Pro te da un perfil tipo portafolio: CV descargable + 3 proyectos fijados para que un reclutador entienda tu valor
                  en 30 segundos.
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="p-6 space-y-2">
                <p className="text-sm font-semibold">Si necesitas formar equipo para una idea</p>
                <p className="text-sm text-muted-foreground">
                  Publicas una idea colaborativa, defines roles y atraes perfiles verificados. Menos “chats vacíos”, más ejecución.
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="p-6 space-y-2">
                <p className="text-sm font-semibold">Si quieres emprender con credibilidad</p>
                <p className="text-sm text-muted-foreground">
                  Con verificación universitaria + analytics sabes qué proyecto interesa más y puedes priorizar lo que realmente mueve a la gente.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section aria-label="Pricing" className="space-y-3">
          <Card className="border-border/60 bg-gradient-to-b from-primary/10 via-transparent to-transparent">
            <CardContent className="p-6 sm:p-10">
              <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_.9fr] gap-6 items-start">
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold">Premium Pro</h3>
                  <p className="text-sm text-muted-foreground max-w-2xl">
                    Para estudiantes, profesionales y emprendedores que quieren destacar con portafolio real y construir equipo.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 text-primary" />
                      <p className="text-sm">Badge verificado universitario</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 text-primary" />
                      <p className="text-sm">Ideas colaborativas + equipos</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 text-primary" />
                      <p className="text-sm">CV descargable en tu perfil</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 text-primary" />
                      <p className="text-sm">3 proyectos fijados</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 text-primary" />
                      <p className="text-sm">Analytics de proyectos y perfil</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 text-primary" />
                      <p className="text-sm">Soporte prioritario</p>
                    </div>
                  </div>
                </div>

                <Card className="border-border/60">
                  <CardContent className="p-6 space-y-4">
                    <div>
                      <div className="text-3xl font-bold">COP $14.900</div>
                      <div className="text-sm text-muted-foreground">por mes</div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        Garantía 7 días
                      </p>
                      <p className="text-sm flex items-center gap-2">
                        <Lock className="h-4 w-4 text-primary" />
                        Sin contrato - Cancela cuando quieras
                      </p>
                      <p className="text-sm flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-primary" />
                        Pago seguro con MercadoPago
                      </p>
                    </div>

                    <Button size="lg" className="w-full" disabled>
                      Premium no disponible
                    </Button>

                    <Button asChild variant="outline" className="w-full">
                      <a href="#incluye">Ver qué incluye</a>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </section>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Preguntas frecuentes</CardTitle>
          </CardHeader>
          <CardContent className="p-6 sm:p-8 space-y-5">
            <div className="space-y-1">
              <p className="text-sm font-medium">¿Por qué necesito verificación universitaria?</p>
              <p className="text-sm text-muted-foreground">
                Porque aumenta la confianza cuando buscas colaboradores o publicas proyectos. El badge deja claro que eres un usuario real y
                reduce el riesgo para quienes se unen contigo.
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">¿Qué diferencia hay entre gratis y Premium Pro?</p>
              <p className="text-sm text-muted-foreground">
                Gratis es para explorar. Premium Pro desbloquea creación (ideas colaborativas y grupos), portafolio completo (CV + fijados) y
                analytics para medir qué funciona.
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">¿Puedo cancelar cuando quiera?</p>
              <p className="text-sm text-muted-foreground">Sí. No hay contrato: cancelas cuando quieras.</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">¿Cómo funciona la verificación?</p>
              <p className="text-sm text-muted-foreground">
                Se realiza con correo institucional (y si aplica, revisión). El objetivo es que tu perfil tenga credibilidad real.
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">¿Qué incluyen los analytics?</p>
              <p className="text-sm text-muted-foreground">
                Vistas y alcance de perfil/proyectos y métricas de engagement (reacciones, comentarios y shares) para entender qué contenido te
                está abriendo oportunidades.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-6 sm:p-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-lg font-semibold">Listo para convertir tu perfil en una vitrina profesional?</p>
              <p className="text-sm text-muted-foreground">
                Prueba Premium Pro 7 días. Sin contrato. Pago seguro con MercadoPago.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Button size="lg" disabled>
                Premium no disponible
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </FullScreenPageLayout>
  );
}
