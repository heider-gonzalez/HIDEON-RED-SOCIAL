import { FullScreenPageLayout } from "@/components/layout/FullScreenPageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TocItem = { id: string; label: string };

export default function TermsOfService() {
  const lastUpdated = new Date().toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const toc: TocItem[] = [
    { id: "1-aceptacion", label: "1. Aceptación de términos" },
    { id: "2-servicio", label: "2. Descripción del servicio" },
    { id: "3-elegibilidad", label: "3. Elegibilidad y registro" },
    { id: "4-cuenta", label: "4. Cuenta de usuario y seguridad" },
    { id: "5-contenido", label: "5. Contenido de usuario" },
    { id: "6-propiedad-intelectual", label: "6. Propiedad intelectual" },
    { id: "8-conducta", label: "8. Conducta prohibida" },
    { id: "9-moderacion", label: "9. Moderación y suspensión" },
    { id: "10-limitacion", label: "10. Limitación de responsabilidad" },
    { id: "11-indemnizacion", label: "11. Indemnización" },
    { id: "12-modificaciones", label: "12. Modificaciones a los términos" },
    { id: "13-ley", label: "13. Ley aplicable y jurisdicción" },
    { id: "14-contacto", label: "14. Contacto" },
  ];

  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <FullScreenPageLayout title="Términos y Condiciones">
      <div className="container px-2 sm:px-4 max-w-4xl pt-6 pb-12 space-y-6">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Términos y Condiciones de Hsocial</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-2 space-y-3">
            <p className="text-sm text-muted-foreground">
              Estos términos explican cómo funciona Hsocial (red social profesional para universitarios y profesionales)
              y qué esperamos de ti al usar la plataforma.
            </p>
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
              <div className="font-medium">Información básica</div>
              <div className="mt-1 text-muted-foreground space-y-1">
                <div>Nombre del servicio: Hsocial</div>
                <div>Sede: Barranquilla, Atlántico, Colombia (placeholder dirección física si aplica)</div>
                <div>Contacto: soporte@hsocial.co</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tabla de contenidos</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {toc.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToId(item.id)}
                  className="text-left text-sm text-primary hover:underline rounded-md px-2 py-1 hover:bg-accent transition-colors"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <section id="1-aceptacion" className="scroll-mt-20">
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">1. Aceptación de términos</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-2 space-y-3 text-sm">
                <p>
                  Al crear una cuenta o usar Hsocial, aceptas estos Términos y Condiciones y nuestra Política de Privacidad.
                  Si no estás de acuerdo, por favor no uses la plataforma.
                </p>
                <p className="text-muted-foreground">
                  Si usas Hsocial en nombre de una organización, confirmas que tienes autorización para aceptar estos términos.
                </p>
              </CardContent>
            </Card>
          </section>

          <section id="2-servicio" className="scroll-mt-20">
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">2. Descripción del servicio</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-2 space-y-3 text-sm">
                <p>Hsocial te permite:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Crear un perfil profesional.</li>
                  <li>Publicar ideas y proyectos.</li>
                  <li>Formar equipos y colaborar.</li>
                  <li>Hacer networking profesional.</li>
                  <li>Construir un portafolio digital.</li>
                </ul>
              </CardContent>
            </Card>
          </section>

          <section id="3-elegibilidad" className="scroll-mt-20">
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">3. Elegibilidad y registro</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-2 space-y-3 text-sm">
                <p>
                  Hsocial está dirigido a estudiantes universitarios (18+) y profesionales. Al registrarte, confirmas que:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Tienes al menos 18 años.</li>
                  <li>La información que proporcionas (nombre, universidad, carrera, semestre, etc.) es real y actual.</li>
                  <li>No estás usando identidades falsas con intención de engañar o suplantar a otros.</li>
                </ul>
                <p>
                  Podemos solicitar verificación universitaria (por ejemplo, mediante correo institucional u otro método) para
                  mostrar un badge de verificación y reducir fraude.
                </p>
              </CardContent>
            </Card>
          </section>

          <section id="4-cuenta" className="scroll-mt-20">
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">4. Cuenta de usuario y seguridad</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-2 space-y-3 text-sm">
                <p>
                  Eres responsable de la actividad que ocurra en tu cuenta. Te pedimos:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>No compartir tus credenciales.</li>
                  <li>Usar contraseñas seguras (si aplica) y mantener tu acceso protegido.</li>
                  <li>Reportarnos accesos no autorizados o vulneraciones de seguridad.</li>
                </ul>
                <p className="text-muted-foreground">
                  Si detectamos actividad inusual, podemos pedir confirmaciones adicionales o restringir temporalmente el acceso
                  para protegerte.
                </p>
              </CardContent>
            </Card>
          </section>

          <section id="5-contenido" className="scroll-mt-20">
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">5. Contenido de usuario</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-2 space-y-3 text-sm">
                <p>
                  En Hsocial puedes publicar contenido (ideas, proyectos, comentarios, perfiles, archivos y otros materiales).
                  Tú eres responsable de lo que publicas.
                </p>
                <p>
                  Al publicar, confirmas que tienes los derechos necesarios para compartir ese contenido y que no vulnera
                  derechos de terceros.
                </p>
                <p className="text-muted-foreground">
                  Ejemplo: si subes un CV o un portafolio, asegúrate de tener permiso para incluir logos, imágenes o material
                  protegido.
                </p>
              </CardContent>
            </Card>
          </section>

          <section id="6-propiedad-intelectual" className="scroll-mt-20">
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">6. Propiedad intelectual</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-2 space-y-3 text-sm">
                <p>
                  Hsocial y sus elementos (marca, diseño, código, interfaz) son propiedad de sus titulares y están protegidos
                  por las normas aplicables.
                </p>
                <p>
                  Tu contenido (ideas, proyectos, textos, imágenes) sigue siendo tuyo. Sin embargo, nos otorgas una licencia
                  limitada para alojarlo, mostrarlo y distribuirlo dentro de la plataforma con el fin de operar el servicio.
                </p>
                <p className="text-muted-foreground">
                  Esto no significa que "nos adueñamos" de tus proyectos; significa que podemos mostrar tu publicación para que
                  otros la vean, comenten o colaboren según tus ajustes de visibilidad.
                </p>
              </CardContent>
            </Card>
          </section>

          <section id="8-conducta" className="scroll-mt-20">
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">8. Conducta prohibida</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-2 space-y-3 text-sm">
                <p>No está permitido:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Suplantar identidad o engañar sobre tu universidad/carrera.</li>
                  <li>Publicar contenido ilegal, violento, de odio, acosador o sexual explícito.</li>
                  <li>Compartir datos personales de terceros sin autorización (doxing).</li>
                  <li>Spam, automatizaciones no autorizadas o manipulación de métricas.</li>
                  <li>Intentos de vulnerar la seguridad del servicio o de otros usuarios.</li>
                </ul>
              </CardContent>
            </Card>
          </section>

          <section id="9-moderacion" className="scroll-mt-20">
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">9. Moderación y suspensión</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-2 space-y-3 text-sm">
                <p>
                  Podemos moderar contenido y tomar acciones para mantener un entorno seguro y profesional, incluyendo:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Eliminar contenido que viole estos términos.</li>
                  <li>Limitar funciones temporalmente.</li>
                  <li>Suspender o cerrar cuentas en casos graves o repetidos.</li>
                </ul>
                <p className="text-muted-foreground">
                  En la medida de lo posible, te notificaremos. También puedes reportar contenido o usuarios.
                </p>
              </CardContent>
            </Card>
          </section>

          <section id="10-limitacion" className="scroll-mt-20">
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">10. Limitación de responsabilidad</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-2 space-y-3 text-sm">
                <p>
                  Hsocial se ofrece "tal cual" y puede presentar interrupciones o errores. Trabajamos para mejorar, pero no
                  podemos garantizar disponibilidad continua.
                </p>
                <p>
                  No somos responsables por:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Decisiones que tomes a partir de interacciones con otros usuarios (por ejemplo, acuerdos de colaboración).</li>
                  <li>Contenido publicado por usuarios.</li>
                  <li>Pérdidas indirectas (por ejemplo, pérdida de oportunidades) derivadas del uso del servicio.</li>
                </ul>
              </CardContent>
            </Card>
          </section>

          <section id="11-indemnizacion" className="scroll-mt-20">
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">11. Indemnización</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-2 space-y-3 text-sm">
                <p>
                  Si tu contenido o uso de Hsocial causa reclamaciones de terceros (por ejemplo, por infracción de derechos
                  de autor o suplantación), te comprometes a mantenernos indemnes en la medida permitida por la ley.
                </p>
              </CardContent>
            </Card>
          </section>

          <section id="12-modificaciones" className="scroll-mt-20">
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">12. Modificaciones a los términos</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-2 space-y-3 text-sm">
                <p>
                  Podemos actualizar estos términos para reflejar cambios del servicio, requisitos legales o mejoras de
                  seguridad. Cuando sea razonable, publicaremos un aviso dentro de la app.
                </p>
              </CardContent>
            </Card>
          </section>

          <section id="13-ley" className="scroll-mt-20">
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">13. Ley aplicable y jurisdicción</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-2 space-y-3 text-sm">
                <p>
                  Estos términos se rigen por las leyes de la República de Colombia. Cualquier disputa será conocida por los
                  jueces competentes de Barranquilla, Atlántico, Colombia.
                </p>
              </CardContent>
            </Card>
          </section>

          <section id="14-contacto" className="scroll-mt-20">
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">14. Contacto</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-2 space-y-3 text-sm">
                <p>
                  Si tienes preguntas sobre estos términos o necesitas soporte, escríbenos a: <span className="font-medium">soporte@hsocial.co</span>.
                </p>
                <p className="text-muted-foreground">
                  (Placeholder) Dirección física si aplica: [Dirección completa], Barranquilla, Atlántico, Colombia.
                </p>
              </CardContent>
            </Card>
          </section>
        </div>

        <div className="text-xs text-muted-foreground text-center pt-2">
          Última actualización: {lastUpdated}
        </div>
      </div>
    </FullScreenPageLayout>
  );
}
