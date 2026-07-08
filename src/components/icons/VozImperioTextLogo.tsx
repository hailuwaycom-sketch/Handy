import vozimperioLogo from "../../assets/vozimperio-logo.svg";

// Logo textual de VozImperio (microfono + corona).
// Reconstruido tras la perdida del componente original: usa el SVG exacto
// aprobado (vozimperio-logo-exacto.svg) como asset estatico.
const VozImperioTextLogo = ({
  width,
  height,
  className,
}: {
  width?: number;
  height?: number;
  className?: string;
}) => {
  return (
    <img
      src={vozimperioLogo}
      width={width}
      height={height}
      className={className}
      alt="VozImperio"
      draggable={false}
    />
  );
};

export default VozImperioTextLogo;
