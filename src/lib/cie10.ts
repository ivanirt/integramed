export type CieTerm = { code: string; label: string };

export const CIE10: CieTerm[] = [
  { code: "E11.9", label: "Diabetes mellitus tipo 2 sin complicaciones" },
  { code: "E78.5", label: "Hiperlipidemia no especificada" },
  { code: "I10", label: "Hipertensión esencial (primaria)" },
  { code: "I25.1", label: "Enfermedad aterosclerótica del corazón" },
  { code: "I50.9", label: "Insuficiencia cardíaca, no especificada" },
  { code: "J06.9", label: "Infección aguda de las vías respiratorias superiores" },
  { code: "J45.9", label: "Asma, no especificada" },
  { code: "K21.0", label: "Enfermedad por reflujo gastroesofágico con esofagitis" },
  { code: "K29.7", label: "Gastritis, no especificada" },
  { code: "K58.9", label: "Síndrome del colon irritable sin diarrea" },
  { code: "K76.0", label: "Hígado graso, no clasificado en otra parte" },
  { code: "M54.5", label: "Lumbago no especificado" },
  { code: "M79.1", label: "Mialgia" },
  { code: "M25.5", label: "Dolor articular" },
  { code: "G43.9", label: "Migraña, no especificada" },
  { code: "G47.0", label: "Trastornos de inicio y mantenimiento del sueño" },
  { code: "F32.9", label: "Episodio depresivo, no especificado" },
  { code: "F41.1", label: "Trastorno de ansiedad generalizada" },
  { code: "F41.9", label: "Trastorno de ansiedad, no especificado" },
  { code: "E03.9", label: "Hipotiroidismo, no especificado" },
  { code: "E05.9", label: "Tirotoxicosis, no especificada" },
  { code: "E66.9", label: "Obesidad, no especificada" },
  { code: "N39.0", label: "Infección de vías urinarias, sitio no especificado" },
  { code: "N95.1", label: "Menopausia y climaterio femenino" },
  { code: "R51", label: "Cefalea" },
  { code: "R53", label: "Malestar y fatiga" },
  { code: "R10.4", label: "Otros dolores abdominales y los no especificados" },
  { code: "R07.9", label: "Dolor en el pecho, no especificado" },
  { code: "R06.0", label: "Disnea" },
  { code: "R00.0", label: "Taquicardia, no especificada" },
  { code: "R42", label: "Mareo y desvanecimiento" },
  { code: "L30.9", label: "Dermatitis, no especificada" },
  { code: "L20.9", label: "Dermatitis atópica, no especificada" },
  { code: "L70.0", label: "Acné vulgar" },
  { code: "J30.9", label: "Rinitis alérgica, no especificada" },
  { code: "J02.9", label: "Faringitis aguda, no especificada" },
  { code: "B34.9", label: "Infección viral, no especificada" },
  { code: "A09", label: "Diarrea y gastroenteritis de presunto origen infeccioso" },
  { code: "D64.9", label: "Anemia, no especificada" },
  { code: "E55.9", label: "Deficiencia de vitamina D, no especificada" },
  { code: "E61.1", label: "Deficiencia de hierro" },
  { code: "Z00.0", label: "Examen médico general" },
  { code: "Z71.3", label: "Supervisión y control dietético" },
  { code: "Z72.0", label: "Uso de tabaco" },
  { code: "Z73.0", label: "Agotamiento vital" },
];

export function searchCie(query: string, limit = 12): CieTerm[] {
  const q = query.trim().toLowerCase();
  if (!q) return CIE10.slice(0, limit);
  return CIE10.filter(
    (item) => item.code.toLowerCase().includes(q) || item.label.toLowerCase().includes(q),
  ).slice(0, limit);
}
