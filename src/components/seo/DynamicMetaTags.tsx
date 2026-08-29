import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

interface DynamicMetaTagsProps {
  title?: string;
  description?: string;
  image?: string;
  noIndex?: boolean;
}

export function DynamicMetaTags({ 
  title = 'HSOCIAL - Red Social Profesional y Académica',
  description = 'Plataforma social académica y profesional para estudiantes universitarios. Comparte ideas, colabora en proyectos y conecta con profesionales.',
  image = '/og-image.png',
  noIndex = false
}: DynamicMetaTagsProps) {
  const location = useLocation();
  const currentUrl = `https://hideon-red-social.vercel.app${location.pathname}`;
  
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={currentUrl} />
      
      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:locale" content="es_CO" />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:url" content={currentUrl} />
      
      {/* Robots */}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
    </Helmet>
  );
}