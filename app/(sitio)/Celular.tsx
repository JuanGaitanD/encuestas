/** Marco de celular dibujado con CSS: isla, botones laterales y pantalla. Lo de dentro es una captura real o un control real de la app. */
export function Celular({ children }: { children: React.ReactNode }) {
  return (
    <div className="marco celular">
      <div className="pantalla">{children}</div>
    </div>
  );
}
