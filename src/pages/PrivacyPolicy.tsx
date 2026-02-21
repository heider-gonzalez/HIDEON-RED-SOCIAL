import { FullScreenPageLayout } from "@/components/layout/FullScreenPageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TocItem = { id: string; label: string };

export default function PrivacyPolicy() {
  const lastUpdated = new Date().toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const toc: TocItem[] = [
    { id: "1-info", label: "1. Información que recopilamos" },
    { id: "2-uso", label: "2. Cómo usamos la información" },
    { id: "3-base-legal", label: "3. Base legal (Colombia / GDPR)" },
    { id: "4-terceros", label: "4. Compartir información con terceros" },
    { id: "5-seguridad", label: "5. Seguridad de datos" },
    { id: "6-retencion", label: "6. Retención de datos" },
    { id: "7-derechos", label: "7. Tus derechos (Habeas Data / ARCO)" },
    { id: "8-cookies", label: "8. Cookies y tecnologías similares" },
    { id: "9-menores", label: "9. Menores de edad" },
    { id: "10-transferencias", label: "10. Transferencias internacionales" },
    { id: "11-cambios", label: "11. Cambios a esta política" },
    { id: "12-contacto", label: "12. Contacto y quejas" },
  ];

  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <FullScreenPageLayout title="Política de Privacidad">
      <div className="container px-2 sm:px-4 max-w-4xl pt-6 pb-12 space-y-6">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Política de Privacidad de Hsocial</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-2 space-y-3">
            <p className="text-sm text-muted-foreground">
              En Hsocial valoramos tu privacidad. Aquí te explicamos qué datos recopilamos, por qué lo hacemos, cómo los
              protegemos y cuáles son tus derechos.
            </p>
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
              <div className="font-medium">Responsable del tratamiento (placeholder)</div>
              <div className="mt-1 text-muted-foreground space-y-1">
                <div>Servicio: Hsocial</div>
                <div>Sede: Barranquilla, Atlántico, Colombia (placeholder dirección física si aplica)</div>
                <div>Correo de contacto: soporte@hsocial.co</div>
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
          <section id="1-info" className="scroll-mt-20">
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">1. Información que recopilamos</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-2 space-y-3 text-sm">
                <p>Podemos recopilar la siguiente información:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <span className="font-medium">Datos de cuenta</span>: email, nombre y datos de perfil (por ejemplo universidad, carrera y
                    semestre).
                  </li>
                  <li>
                    <span className="font-medium">Contenido que publicas</span>: ideas, proyectos, comentarios, reacciones, guardados y follows.
                  </li>
                  <li>
                    <span className="font-medium">Archivos y portafolio</span>: foto de perfil, bio y archivos que decidas subir.
                  </li>
                  <li>
                    <span className="font-medium">Datos de uso</span>: páginas visitadas dentro de la app, interacciones y tiempo de uso.
                  </li>
                  <li>
                    <span className="font-medium">Analytics</span>: métricas de vistas de perfil y engagement.
                  </li>
                </ul>
              </CardContent>
            </Card>
          </section>

          <section id="2-uso" className="scroll-mt-20">
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">2. Cómo usamos la información</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-2 space-y-3 text-sm">
                <p>Usamos tu información para:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Crear y administrar tu cuenta.</li>
                  <li>Mostrar tu perfil y contenido a otros usuarios según la configuración de visibilidad.</li>
                  <li>Permitir colaboración (equipos, chats, interacciones).</li>
                  <li>Mejorar la experiencia, seguridad y rendimiento de la plataforma.</li>
                  <li>
                    Entregarte funciones de la plataforma y mantener el servicio funcionando.
                  </li>
                  <li>Responder solicitudes de soporte y gestionar reportes.</li>
                </ul>
                <p className="text-muted-foreground">
                  Ejemplo: podemos mostrarte métricas básicas de tu perfil (vistas, alcance) y de tus proyectos.
                </p>
              </CardContent>
            </Card>
          </section>

          <section id="3-base-legal" className="scroll-mt-20">
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">3. Base legal (Colombia / GDPR)</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-2 space-y-3 text-sm">
                <p>
                  En Colombia tratamos datos personales conforme a la <span className="font-medium">Ley 1581 de 2012</span>, el régimen de
                  <span className="font-medium"> Habeas Data</span> y demás normas aplicables.
                </p>
                <p>
                  En general, tratamos tus datos con base en:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <span className="font-medium">Tu autorización</span> (por ejemplo, al crear tu cuenta o completar tu perfil).
                  </li>
                  <li>
                    <span className="font-medium">Ejecución del servicio</span> (necesario para que Hsocial funcione: autenticación, mostrar
                    contenido, etc.).
                  </li>
                  <li>
                    <span className="font-medium">Interés legítimo</span> (por ejemplo, prevenir fraude, mejorar seguridad y desempeño).
                  </li>
                </ul>
                <p className="text-muted-foreground">
                  Si en algún momento aplicara GDPR (por ejemplo, si estás en la UE), procuramos seguir principios compatibles
                  como minimización de datos, finalidad y transparencia.
                </p>
              </CardContent>
            </Card>
          </section>

          <section id="4-terceros" className="scroll-mt-20">
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">4. Compartir información con terceros</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-2 space-y-3 text-sm">
                <p>
                  Compartimos información solo cuando es necesario para operar el servicio o cumplir obligaciones legales.
                  Podemos usar terceros como:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <span className="font-medium">Supabase</span>: hosting, base de datos y autenticación.
                  </li>
                  <li>
                    <span className="font-medium">Cloudflare</span>: CDN y seguridad (por ejemplo, protección contra ataques).
                  </li>
                </ul>
                <p className="text-muted-foreground">
                  No vendemos tus datos personales. Si en el futuro hacemos integraciones adicionales, actualizaremos esta
                  política.
                </p>
              </CardContent>
            </Card>
          </section>

          <section id="5-seguridad" className="scroll-mt-20">
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">5. Seguridad de datos</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-2 space-y-3 text-sm">
                <p>
                  Tomamos medidas técnicas y organizacionales razonables para proteger tu información, como controles de
                  acceso, cifrado en tránsito (HTTPS) y buenas prácticas de seguridad.
                </p>
                <p className="text-muted-foreground">
                  Aun así, ningún sistema es 100% infalible. Si detectamos incidentes relevantes, haremos esfuerzos razonables
                  para notificarte y mitigar el impacto.
                </p>
              </CardContent>
            </Card>
          </section>

          <section id="6-retencion" className="scroll-mt-20">
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">6. Retención de datos</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-2 space-y-3 text-sm">
                <p>
                  Conservamos tu información el tiempo necesario para:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Prestar el servicio.</li>
                  <li>Cumplir obligaciones legales y requerimientos de autoridades.</li>
                  <li>Resolver disputas y hacer cumplir estos términos.</li>
                </ul>
                <p className="text-muted-foreground">
                  Si solicitas eliminación, podemos conservar cierta información mínima cuando sea necesario por razones legales
                  o de seguridad (por ejemplo, prevención de fraude).
                </p>
              </CardContent>
            </Card>
          </section>

          <section id="7-derechos" className="scroll-mt-20">
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">7. Tus derechos (Habeas Data / ARCO)</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-2 space-y-3 text-sm">
                <p>
                  En Colombia, tienes derecho a conocer, actualizar y rectificar tus datos personales, así como solicitar su
                  eliminación cuando sea procedente. Estos derechos se relacionan con el <span className="font-medium">Habeas Data</span>.
                </p>
                <p>
                  También reconocemos los derechos ARCO:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><span className="font-medium">Acceso</span>: saber qué datos tenemos.</li>
                  <li><span className="font-medium">Rectificación</span>: corregir datos inexactos.</li>
                  <li><span className="font-medium">Cancelación</span>: solicitar eliminación cuando aplique.</li>
                  <li><span className="font-medium">Oposición</span>: oponerte a ciertos tratamientos, cuando aplique.</li>
                </ul>
                <p className="text-muted-foreground">
                  Para ejercerlos, escríbenos a soporte@hsocial.co indicando tu solicitud y el correo asociado a tu cuenta.
                </p>
              </CardContent>
            </Card>
          </section>

          <section id="8-cookies" className="scroll-mt-20">
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">8. Cookies y tecnologías similares</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-2 space-y-3 text-sm">
                <p>
                  Podemos usar cookies o tecnologías similares para:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Mantener tu sesión activa y recordar preferencias.</li>
                  <li>Seguridad (por ejemplo, detección de abusos).</li>
                  <li>Medición básica de uso y rendimiento (analytics internos).</li>
                </ul>
                <p className="text-muted-foreground">
                  Puedes controlar cookies desde tu navegador. Si las deshabilitas, algunas funciones podrían no funcionar
                  correctamente.
                </p>
              </CardContent>
            </Card>
          </section>

          <section id="9-menores" className="scroll-mt-20">
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">9. Menores de edad</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-2 space-y-3 text-sm">
                <p>
                  Hsocial está pensado para mayores de 18 años. Si detectamos que un menor de edad usa la plataforma, podemos
                  suspender la cuenta y eliminar datos, según corresponda.
                </p>
              </CardContent>
            </Card>
          </section>

          <section id="10-transferencias" className="scroll-mt-20">
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">10. Transferencias internacionales</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-2 space-y-3 text-sm">
                <p>
                  Algunos de nuestros proveedores (por ejemplo infraestructura en la nube) pueden procesar datos fuera de
                  Colombia. Cuando ocurra, procuramos que existan medidas adecuadas de protección y contratos con
                  obligaciones de confidencialidad y seguridad.
                </p>
              </CardContent>
            </Card>
          </section>

          <section id="11-cambios" className="scroll-mt-20">
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">11. Cambios a esta política</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-2 space-y-3 text-sm">
                <p>
                  Podemos actualizar esta política para reflejar cambios de la app, nuevas integraciones o requerimientos
                  legales. Publicaremos la fecha de última actualización y, cuando sea razonable, avisos dentro de la app.
                </p>
              </CardContent>
            </Card>
          </section>

          <section id="12-contacto" className="scroll-mt-20">
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">12. Contacto y quejas</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-2 space-y-3 text-sm">
                <p>
                  Si tienes preguntas o solicitudes sobre privacidad, contáctanos en: <span className="font-medium">soporte@hsocial.co</span>.
                </p>
                <p className="text-muted-foreground">
                  Si consideras que tus derechos no han sido atendidos, puedes presentar quejas ante las autoridades
                  competentes en Colombia, según el marco de la Ley 1581 de 2012.
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
