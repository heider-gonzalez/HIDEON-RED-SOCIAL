export type InstitutionOption = {
  id: string;
  name: string;
  emailDomain?: string;
};

export const institutionsBarranquilla: InstitutionOption[] = [
  { id: "uninorte", name: "Universidad del Norte (Uninorte)", emailDomain: "@uninorte.edu.co" },
  { id: "uniatlantico", name: "Universidad del Atlántico", emailDomain: "@mail.uniatlantico.edu.co" },
  { id: "cuc", name: "Universidad de la Costa (CUC)", emailDomain: "@cuc.edu.co" },
  { id: "unireformada", name: "Corporación Universitaria Reformada", emailDomain: "@unireformada.edu.co" },
  { id: "unisimon", name: "Universidad Simón Bolívar", emailDomain: "@unisimonbolivar.edu.co" },
  { id: "uac", name: "Universidad Autónoma del Caribe", emailDomain: "@uac.edu.co" },
  { id: "unilibre", name: "Universidad Libre Seccional Barranquilla", emailDomain: "@unilibre.edu.co" },
  { id: "americana", name: "Corporación Universitaria Americana", emailDomain: "@americana.edu.co" },
  { id: "unimet", name: "Universidad Metropolitana", emailDomain: "@unimetro.edu.co" },
  { id: "iub", name: "Institución Universitaria de Barranquilla (IUB)", emailDomain: "@iub.edu.co" },
  { id: "unipau", name: "Corporación Universitaria Rafael Núñez", emailDomain: "@curnvirtual.edu.co" },
  { id: "itpca", name: "Politécnico Costa Atlántica", emailDomain: "@pca.edu.co" },
  { id: "sanmartin", name: "Fundación Universitaria San Martín", emailDomain: "@sanmartin.edu.co" },
  { id: "uniminuto", name: "UNIMINUTO Sede Barranquilla", emailDomain: "@uniminuto.edu.co" },
  { id: "fbc", name: "Fundación Bolivariana de Colombia", emailDomain: "@fbc.edu.co" },
  { id: "sena", name: "SENA (Nodos Barranquilla)", emailDomain: "@misena.edu.co" },
  { id: "otros", name: "Otra (No listada)" },
];

export function getInstitutionByDomain(email: string): InstitutionOption | null {
  const domain = "@" + email.split("@")[1]?.toLowerCase();
  if (!domain || domain === "@") return null;
  return institutionsBarranquilla.find(
    (inst) => inst.emailDomain && domain === inst.emailDomain.toLowerCase()
  ) ?? null;
}

export function validateEmailDomain(email: string, institutionId: string): boolean {
  const institution = institutionsBarranquilla.find((inst) => inst.id === institutionId);
  if (!institution?.emailDomain) return false;
  const domain = "@" + email.split("@")[1]?.toLowerCase();
  return domain === institution.emailDomain.toLowerCase();
}
