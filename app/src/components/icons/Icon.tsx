import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../../theme';

/** Stroke icons transcribed from the BackPapers design (24×24 viewBox). */
export type IconName =
  | 'feed'
  | 'profile'
  | 'plus'
  | 'close'
  | 'back'
  | 'chevronRight'
  | 'chevronDown'
  | 'filter'
  | 'settings'
  | 'more'
  | 'lock'
  | 'folder'
  | 'edit'
  | 'trash'
  | 'image'
  | 'check'
  | 'replace'
  | 'alert'
  | 'clock';

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

export function Icon({
  name,
  size = 24,
  color = colors.text,
  strokeWidth = 2,
}: Props) {
  const stroke = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {renderPaths(name, stroke, color)}
    </Svg>
  );
}

function renderPaths(
  name: IconName,
  s: Record<string, string | number>,
  color: string,
) {
  switch (name) {
    case 'feed':
      return (
        <>
          <Rect x={4} y={3} width={7} height={18} rx={2} {...s} />
          <Rect x={13} y={3} width={7} height={18} rx={2} {...s} />
        </>
      );
    case 'profile':
      return (
        <>
          <Circle cx={12} cy={8} r={4} {...s} />
          <Path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" {...s} />
        </>
      );
    case 'plus':
      return <Path d="M12 5v14M5 12h14" {...s} />;
    case 'close':
      return <Path d="M6 6l12 12M18 6L6 18" {...s} />;
    case 'back':
      return <Path d="M15 5l-7 7 7 7" {...s} />;
    case 'chevronRight':
      return <Path d="M9 5l7 7-7 7" {...s} />;
    case 'chevronDown':
      return <Path d="M6 9l6 6 6-6" {...s} />;
    case 'filter':
      return <Path d="M4 7h16M7 12h10M10 17h4" {...s} />;
    case 'settings':
      return (
        <>
          <Circle cx={12} cy={12} r={3} {...s} />
          <Path
            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
            {...s}
          />
        </>
      );
    case 'more':
      return (
        <>
          <Circle cx={5} cy={12} r={1.9} fill={color} />
          <Circle cx={12} cy={12} r={1.9} fill={color} />
          <Circle cx={19} cy={12} r={1.9} fill={color} />
        </>
      );
    case 'lock':
      return (
        <>
          <Rect x={5} y={11} width={14} height={9} rx={2} {...s} />
          <Path d="M8 11V8a4 4 0 0 1 8 0v3" {...s} />
        </>
      );
    case 'folder':
      return (
        <Path
          d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
          {...s}
        />
      );
    case 'edit':
      return <Path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4" {...s} />;
    case 'trash':
      return <Path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" {...s} />;
    case 'image':
      return (
        <>
          <Rect x={5} y={2.5} width={14} height={19} rx={2.5} {...s} />
          <Circle cx={9.5} cy={8} r={1.5} {...s} />
          <Path d="M5 17l4.5-4.5 3.5 3.5 2-2 4 4" {...s} />
        </>
      );
    case 'check':
      return <Path d="M5 12.5l4.5 4.5L19 7.5" {...s} />;
    case 'replace':
      return <Path d="M4 8h14l-3-3M20 16H6l3 3" {...s} />;
    case 'alert':
      return (
        <>
          <Circle cx={12} cy={12} r={9} {...s} />
          <Path d="M12 7.5v5.5M12 16.5v.01" {...s} />
        </>
      );
    case 'clock':
      return (
        <>
          <Circle cx={12} cy={12} r={9} {...s} />
          <Path d="M12 7v5l3 2" {...s} />
        </>
      );
  }
}
