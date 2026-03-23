import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExternalLink, CheckCircle } from "lucide-react";

export function CorsInstructions() {
  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Configuración CORS de Cloudflare R2</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            Para que los videos y archivos de R2 funcionen correctamente, necesitas configurar CORS en tu bucket de Cloudflare.
          </AlertDescription>
        </Alert>

        <div className="space-y-6">
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Paso 1: Acceder al Dashboard de Cloudflare
            </h4>
            <ol className="list-decimal list-inside space-y-2 text-sm ml-6">
              <li>Ve a <a href="https://dash.cloudflare.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                dash.cloudflare.com <ExternalLink className="h-3 w-3" />
              </a></li>
              <li>Selecciona tu cuenta</li>
              <li>Ve a la sección "R2 Object Storage"</li>
              <li>Encuentra tu bucket (ej: "hideon-media" o "archivos-multimedia")</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Paso 2: Configurar CORS
            </h4>
            <ol className="list-decimal list-inside space-y-2 text-sm ml-6">
              <li>En tu bucket, ve a la pestaña "Settings"</li>
              <li>Busca la sección "CORS policy"</li>
              <li>Añade esta configuración CORS:</li>
            </ol>
            
            <div className="mt-3 p-4 bg-gray-50 rounded-lg border">
              <pre className="text-xs overflow-x-auto">
{`[
  {
    "AllowedOrigins": [
      "https://hsocial-app.onrender.com",
      "https://*.lovable.app",
      "http://localhost:8081",
      "http://127.0.0.1:8081"
    ],
    "AllowedMethods": ["GET", "HEAD", "OPTIONS"],
    "AllowedHeaders": [
      "Range",
      "Content-Type",
      "Authorization",
      "Cache-Control",
      "X-Requested-With"
    ],
    "ExposeHeaders": [
      "ETag", 
      "Content-Length",
      "Accept-Ranges",
      "Content-Range"
    ],
    "MaxAgeSeconds": 86400
  }
]`}
              </pre>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Paso 3: Habilitar Acceso Público
            </h4>
            <ol className="list-decimal list-inside space-y-2 text-sm ml-6">
              <li>En la sección "Public access", habilita el acceso público</li>
              <li>Confirma que quieres hacer el bucket público</li>
              <li>Guarda los cambios</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-orange-600" />
              Paso 4: Dominio Personalizado (Opcional)
            </h4>
            <p className="text-sm text-muted-foreground mb-2">
              Para mejores performance y branding, puedes configurar un dominio personalizado:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-sm ml-6">
              <li>En tu bucket, ve a "Custom domains"</li>
              <li>Añade un subdominio como: <code className="bg-gray-100 px-1 rounded">files.tudominio.com</code></li>
              <li>Configura el CNAME en tu DNS</li>
              <li>Actualiza las URLs en la aplicación</li>
            </ol>
          </div>
        </div>

        <Alert>
          <AlertDescription>
            <strong>Importante:</strong> Después de configurar CORS, los archivos nuevos se subirán a R2 automáticamente. 
            Usa el panel de migración para mover archivos existentes de Supabase a R2.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}