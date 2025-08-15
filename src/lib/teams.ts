export const TEAMS: Record<string, { name: string; logo: string }> = {
  ARS: { name: "Arsenal", logo: "/logos/ARS_logo.svg" },
  AVL: { name: "Aston Villa", logo: "/logos/AVL_logo.svg" },
  BHA: { name: "Brighton", logo: "/logos/BHA_logo.svg" },
  BOU: { name: "Bournemouth", logo: "/logos/BOU_logo.svg" },
  BRE: { name: "Brentford", logo: "/logos/BRE_logo.svg" },
  BUR: { name: "Burnley", logo: "/logos/BUR_logo.svg" },
  CHE: { name: "Chelsea", logo: "/logos/CHE_logo.svg" },
  CRY: { name: "Crystal Palace", logo: "/logos/CRY_logo.svg" },
  EVE: { name: "Everton", logo: "/logos/EVE_logo.svg" },
  FUL: { name: "Fulham", logo: "/logos/FUL_logo.svg" },
  LEE: { name: "Leeds", logo: "/logos/LEE_logo.svg" },
  LIV: { name: "Liverpool", logo: "/logos/LIV_logo.svg" },
  MCI: { name: "Manchester City", logo: "/logos/MCI_logo.svg" },
  MUN: { name: "Manchester United", logo: "/logos/MUN_logo.svg" },
  NEW: { name: "Newcastle", logo: "/logos/NEW_logo.svg" },
  NFO: { name: "Nottingham Forest", logo: "/logos/NFO_logo.svg" },
  SUN: { name: "Sunderland", logo: "/logos/SUN_logo.svg" },
  TOT: { name: "Tottenham", logo: "/logos/TOT_logo.svg" },
  WHU: { name: "West Ham", logo: "/logos/WHU_logo.svg" },
  WOL: { name: "Wolves", logo: "/logos/WOL_logo.svg" },
};

export const teamName = (code: string) => TEAMS[code]?.name ?? code;
export const teamLogo = (code: string) => TEAMS[code]?.logo ?? "/logos/placeholder.svg";
