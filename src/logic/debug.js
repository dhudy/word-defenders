const SCENES = ['Title', 'MissionMap', 'Game', 'Results', 'Grownups'];

// Dev-only URL shortcuts for screenshots, e.g. ?mission=4&wave=5&coins=999.
export function parseDebug(search) {
  const params = new URLSearchParams(search);
  const scene = params.get('scene') ?? (params.has('mission') ? 'Game' : null);
  if (!SCENES.includes(scene)) return null;
  const int = (name, min, max) => {
    const n = Number(params.get(name));
    return params.has(name) && Number.isInteger(n) && n >= min && n <= max ? n : undefined;
  };
  return {
    scene,
    data: {
      missionId: int('mission', 1, 10) ?? 1,
      wave: int('wave', 1, 5),
      coins: int('coins', 0, 99999),
      hearts: int('hearts', 1, 10),
      stars: int('stars', 1, 3) ?? 3,
      autostart: params.get('autostart') === '1',
    },
  };
}
