import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FullScreenPageLayout } from "@/components/layout/FullScreenPageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BarChart3, ExternalLink, Mail, TrendingUp } from "lucide-react";
import { ChartContainer } from "@/components/ui/chart";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type Summary = {
  days: number;
  profile_views: number;
  project_views: number;
  project_click_demo: number;
  project_click_contact: number;
};

type DailyRow = {
  day: string;
  profile_views: number;
  project_views: number;
  project_click_demo: number;
  project_click_contact: number;
};

type TopProject = {
  post_id: string;
  title: string;
  views: number;
  demo_clicks: number;
  contact_clicks: number;
};

type MyProjectRow = {
  post_id: string;
  title: string;
  views: number;
  demo_clicks: number;
  contact_clicks: number;
  technologies: string[] | null;
  demo_url: string | null;
};

type ProjectDailyRow = {
  day: string;
  views: number;
  demo_clicks: number;
  contact_clicks: number;
};

export default function Analytics() {
  const [days, setDays] = useState(7);
  const [tab, setTab] = useState("resumen");
  const [search, setSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState<MyProjectRow | null>(null);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["analytics-summary", days],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_my_analytics_summary", {
        p_days: days,
      });
      if (error) throw error;
      return data as Summary;
    },
  });

  const { data: daily, isLoading: dailyLoading } = useQuery({
    queryKey: ["analytics-daily", days],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_my_analytics_daily", {
        p_days: days,
      });
      if (error) throw error;
      return (data || []) as DailyRow[];
    },
  });

  const { data: topProjects, isLoading: topLoading } = useQuery({
    queryKey: ["analytics-top-projects", days],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_my_top_projects", {
        p_days: days,
        p_limit: 10,
      });
      if (error) throw error;
      return (data || []) as TopProject[];
    },
  });

  const { data: myProjects, isLoading: myProjectsLoading } = useQuery({
    queryKey: ["analytics-my-projects", days],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_my_projects_analytics", {
        p_days: days,
        p_limit: 200,
      });
      if (error) throw error;
      return (data || []) as MyProjectRow[];
    },
  });

  const { data: projectDaily, isLoading: projectDailyLoading } = useQuery({
    queryKey: ["analytics-project-daily", selectedProject?.post_id, days],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_my_project_daily", {
        p_post_id: selectedProject?.post_id,
        p_days: days,
      });
      if (error) throw error;
      return (data || []) as ProjectDailyRow[];
    },
    enabled: !!selectedProject?.post_id,
  });

  const chartData = useMemo(() => {
    return (daily || []).map((row) => ({
      ...row,
      dayLabel: format(new Date(row.day), "d MMM", { locale: es }),
    }));
  }, [daily]);

  const projectChartData = useMemo(() => {
    return (projectDaily || []).map((row) => ({
      ...row,
      dayLabel: format(new Date(row.day), "d MMM", { locale: es }),
    }));
  }, [projectDaily]);

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = myProjects || [];
    if (!q) return base;
    return base.filter((p) => (p.title || "").toLowerCase().includes(q));
  }, [myProjects, search]);

  const selectedProjectKpis = useMemo(() => {
    if (!selectedProject) return null;
    const clicks = (selectedProject.demo_clicks || 0) + (selectedProject.contact_clicks || 0);
    const ctr = selectedProject.views ? Math.round((clicks / selectedProject.views) * 100) : 0;
    return { clicks, ctr };
  }, [selectedProject]);

  const isLoading = summaryLoading || dailyLoading || topLoading;

  return (
    <FullScreenPageLayout title="Analytics">
      <div className="container px-2 sm:px-4 max-w-5xl pt-6 pb-12 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="flex items-center gap-1">
              <BarChart3 className="h-3.5 w-3.5" />
              Alcance
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={days === 7 ? "default" : "outline"}
              size="sm"
              onClick={() => setDays(7)}
            >
              7 días
            </Button>
            <Button
              type="button"
              variant={days === 30 ? "default" : "outline"}
              size="sm"
              onClick={() => setDays(30)}
            >
              30 días
            </Button>
            <Button
              type="button"
              variant={days === 90 ? "default" : "outline"}
              size="sm"
              onClick={() => setDays(90)}
            >
              90 días
            </Button>
          </div>
        </div>

        <>
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="resumen">Resumen</TabsTrigger>
              <TabsTrigger value="proyectos">Proyectos</TabsTrigger>
            </TabsList>

            <TabsContent value="resumen" className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Card className="border-border/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Vistas de perfil</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{summary?.profile_views ?? 0}</div>
                  </CardContent>
                </Card>

                <Card className="border-border/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Vistas de proyectos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{summary?.project_views ?? 0}</div>
                  </CardContent>
                </Card>

                <Card className="border-border/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Clicks a Demo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{summary?.project_click_demo ?? 0}</div>
                  </CardContent>
                </Card>

                <Card className="border-border/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Clicks a Contacto</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{summary?.project_click_contact ?? 0}</div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle>Actividad</CardTitle>
                </CardHeader>
                <CardContent className="h-[320px]">
                  {isLoading ? (
                    <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Cargando...</div>
                  ) : (
                    <ChartContainer
                      config={{
                        profile_views: { label: "Perfil", color: "#2563eb" },
                        project_views: { label: "Proyectos", color: "#16a34a" },
                        project_click_demo: { label: "Demo", color: "#f59e0b" },
                        project_click_contact: { label: "Contacto", color: "#a855f7" },
                      }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="dayLabel" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="profile_views" name="Perfil" stroke="#2563eb" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="project_views" name="Proyectos" stroke="#16a34a" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="project_click_demo" name="Demo" stroke="#f59e0b" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="project_click_contact" name="Contacto" stroke="#a855f7" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle>Top proyectos</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">Cargando...</div>
                  ) : (
                    <div className="overflow-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-muted-foreground">
                            <th className="py-2 pr-3">Proyecto</th>
                            <th className="py-2 pr-3">Vistas</th>
                            <th className="py-2 pr-3">Demo</th>
                            <th className="py-2 pr-3">Contacto</th>
                            <th className="py-2">CTR</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(topProjects || []).map((p) => {
                            const clicks = (p.demo_clicks || 0) + (p.contact_clicks || 0);
                            const ctr = p.views ? Math.round((clicks / p.views) * 100) : 0;

                            return (
                              <tr key={p.post_id} className="border-t border-border/60">
                                <td className="py-3 pr-3 font-medium">{p.title}</td>
                                <td className="py-3 pr-3">{p.views}</td>
                                <td className="py-3 pr-3">
                                  <span className="inline-flex items-center gap-1">
                                    <ExternalLink className="h-4 w-4" />
                                    {p.demo_clicks}
                                  </span>
                                </td>
                                <td className="py-3 pr-3">
                                  <span className="inline-flex items-center gap-1">
                                    <Mail className="h-4 w-4" />
                                    {p.contact_clicks}
                                  </span>
                                </td>
                                <td className="py-3">{ctr}%</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="proyectos" className="space-y-6">
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <CardTitle>Tus proyectos (últimos {days} días)</CardTitle>
                    <div className="w-full sm:w-[320px]">
                      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar proyecto..." />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {myProjectsLoading ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">Cargando...</div>
                  ) : filteredProjects.length === 0 ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">No se encontraron proyectos.</div>
                  ) : (
                    <div className="overflow-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-muted-foreground">
                            <th className="py-2 pr-3">Proyecto</th>
                            <th className="py-2 pr-3">Tecnologías</th>
                            <th className="py-2 pr-3">Demo URL</th>
                            <th className="py-2 pr-3">Vistas</th>
                            <th className="py-2 pr-3">Demo</th>
                            <th className="py-2 pr-3">Contacto</th>
                            <th className="py-2 pr-3">CTR</th>
                            <th className="py-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredProjects.map((p) => {
                            const clicks = (p.demo_clicks || 0) + (p.contact_clicks || 0);
                            const ctr = p.views ? Math.round((clicks / p.views) * 100) : 0;

                            return (
                              <tr key={p.post_id} className="border-t border-border/60">
                                <td className="py-3 pr-3 font-medium">{p.title}</td>
                                <td className="py-3 pr-3">
                                  {p.technologies && p.technologies.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {p.technologies.slice(0, 2).map((tech, index) => (
                                        <Badge key={index} variant="secondary" className="text-xs">
                                          {tech}
                                        </Badge>
                                      ))}
                                      {p.technologies.length > 2 && (
                                        <Badge variant="secondary" className="text-xs">
                                          +{p.technologies.length - 2}
                                        </Badge>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">-</span>
                                  )}
                                </td>
                                <td className="py-3 pr-3">
                                  {p.demo_url ? (
                                    <a 
                                      href={p.demo_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-xs flex items-center gap-1"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                      Ver demo
                                    </a>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">-</span>
                                  )}
                                </td>
                                <td className="py-3 pr-3">{p.views}</td>
                                <td className="py-3 pr-3">{p.demo_clicks}</td>
                                <td className="py-3 pr-3">{p.contact_clicks}</td>
                                <td className="py-3 pr-3">{ctr}%</td>
                                <td className="py-3 text-right">
                                  <Button size="sm" variant="outline" onClick={() => setSelectedProject(p)}>
                                    Ver detalles
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Dialog open={!!selectedProject} onOpenChange={(open) => !open && setSelectedProject(null)}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>{selectedProject?.title || "Proyecto"}</DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Card className="border-border/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Vistas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedProject?.views ?? 0}</div>
                  </CardContent>
                </Card>

                <Card className="border-border/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Clicks Demo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedProject?.demo_clicks ?? 0}</div>
                  </CardContent>
                </Card>

                <Card className="border-border/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Clicks Contacto</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedProject?.contact_clicks ?? 0}</div>
                  </CardContent>
                </Card>

                <Card className="border-border/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">CTR</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedProjectKpis?.ctr ?? 0}%</div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Rendimiento diario
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[260px]">
                  {projectDailyLoading ? (
                    <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Cargando...</div>
                  ) : (
                    <ChartContainer
                      config={{
                        views: { label: "Vistas", color: "#16a34a" },
                        demo_clicks: { label: "Demo", color: "#f59e0b" },
                        contact_clicks: { label: "Contacto", color: "#a855f7" },
                      }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={projectChartData} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="dayLabel" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="views" name="Vistas" stroke="#16a34a" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="demo_clicks" name="Demo" stroke="#f59e0b" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="contact_clicks" name="Contacto" stroke="#a855f7" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle>Insights</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  {(selectedProject?.views ?? 0) === 0 ? (
                    <div>Tu proyecto aún no tiene vistas. Comparte el enlace en tu perfil y en grupos para empezar a generar tráfico.</div>
                  ) : (selectedProjectKpis?.clicks ?? 0) === 0 ? (
                    <div>
                      Estás recibiendo vistas pero sin clicks. Recomendación: agrega una Demo clara y un CTA visible ("Probar demo" / "Contactar").
                    </div>
                  ) : (selectedProjectKpis?.ctr ?? 0) < 5 ? (
                    <div>
                      Tu CTR está bajo (&lt; 5%). Recomendación: mejora la descripción inicial y coloca el enlace de Demo/Contacto en la parte superior.
                    </div>
                  ) : (
                    <div>Buen rendimiento. Mantén la consistencia y prueba nuevas publicaciones para aumentar el alcance.</div>
                  )}
                </CardContent>
              </Card>
            </DialogContent>
          </Dialog>
        </>
      </div>
    </FullScreenPageLayout>
  );
}
