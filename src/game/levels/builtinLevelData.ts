/* eslint-disable */
/**
 * 本文件由 scripts/generate-builtin-levels.ts 离线生成，请勿手工编辑。
 * 20 个精选关卡：1~3 新手(15~30)、4~10 钻洞(35~55)、11~20 高难(60~85)，
 * 难度分单调不减，全部通过死区/封门校验与 GameEngine 盲测。
 */
import type { LevelDefinition } from './LevelSchema.js';

export const BUILTIN_LEVEL_DATA: readonly LevelDefinition[] = [
  {
    "version": 1,
    "id": "builtin-01",
    "name": "精选关卡 01",
    "cols": 42,
    "rows": 38,
    "palette": {
      ".": {
        "symbol": ".",
        "role": "EMPTY",
        "hp": 0,
        "color": "#000000"
      },
      "S": {
        "symbol": "S",
        "role": "STEEL",
        "hp": 9999,
        "color": "#9aa4b2"
      },
      "R": {
        "symbol": "R",
        "role": "NORMAL",
        "hp": 1,
        "color": "#ef1d1d"
      },
      "G": {
        "symbol": "G",
        "role": "NORMAL",
        "hp": 1,
        "color": "#41b06e"
      },
      "B": {
        "symbol": "B",
        "role": "NORMAL",
        "hp": 1,
        "color": "#2f6fed"
      },
      "Y": {
        "symbol": "Y",
        "role": "NORMAL",
        "hp": 1,
        "color": "#f4b740"
      },
      "P": {
        "symbol": "P",
        "role": "NORMAL",
        "hp": 1,
        "color": "#b06ab3"
      },
      "C": {
        "symbol": "C",
        "role": "NORMAL",
        "hp": 1,
        "color": "#4ecdc4"
      },
      "O": {
        "symbol": "O",
        "role": "NORMAL",
        "hp": 1,
        "color": "#ff7b54"
      },
      "D": {
        "symbol": "D",
        "role": "NORMAL",
        "hp": 2,
        "color": "#f4b740"
      },
      "E": {
        "symbol": "E",
        "role": "NORMAL",
        "hp": 3,
        "color": "#b06ab3"
      },
      "F": {
        "symbol": "F",
        "role": "NORMAL",
        "hp": 4,
        "color": "#ff7b54"
      },
      "M": {
        "symbol": "M",
        "role": "BOMB",
        "hp": 1,
        "color": "#111111"
      },
      "L": {
        "symbol": "L",
        "role": "PRISM",
        "hp": 1,
        "color": "#7dd3fc"
      },
      "K": {
        "symbol": "K",
        "role": "CORE",
        "hp": 5,
        "color": "#f59e0b"
      },
      "A": {
        "symbol": "A",
        "role": "NORMAL",
        "hp": 2,
        "color": "#4ecdc4"
      },
      "H": {
        "symbol": "H",
        "role": "NORMAL",
        "hp": 2,
        "color": "#b06ab3"
      },
      "I": {
        "symbol": "I",
        "role": "NORMAL",
        "hp": 2,
        "color": "#ef1d1d"
      }
    },
    "rleGrid": "42.|42.|17.2D4.2D17.|18.D4.D18.|12.2G4.D4.D4.2G12.|11.4G.2R6.2R.4G11.|11.3GD3R6.3RD3G11.|12.G3D3R4.3R3DG12.|13.3DR8.R3D13.|8.C5.D2Y8.2YD5.C8.|7.4C4.3Y6.3Y4.4C7.|7.3C2Y4.2Y6.2Y4.2Y3C7.|7.3C3YA14.A3Y3C7.|10.3Y5A6.5A3Y10.|12.2YA3.A4.A3.A2Y12.|12.3Y2H.I4.I.2H3Y12.|12.3Y3HP4.P3H3Y12.|12.3Y2H.I4.I.2H3Y12.|12.Y2A2.2A4.2A2.2AY12.|10.3Y5A6.5A3Y10.|7.3C3YA14.A3Y3C7.|7.3C2Y4.2Y6.2Y4.2Y3C7.|7.4C4.3Y6.3Y4.4C7.|8.C5.D2Y8.2YD5.C8.|13.3DR8.R3D13.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.",
    "mechanics": {
      "initialSkills": {
        "multiLaunch": 3,
        "tripleSplit": 2
      }
    },
    "difficultyScore": {
      "totalScore": 15,
      "tier": "EASY",
      "breakableCount": 256,
      "steelOcclusionRatio": 0,
      "simBreakRate20s": 0.53515625,
      "hasDeadZoneWarning": false
    }
  },
  {
    "version": 1,
    "id": "builtin-02",
    "name": "精选关卡 02",
    "cols": 42,
    "rows": 38,
    "palette": {
      ".": {
        "symbol": ".",
        "role": "EMPTY",
        "hp": 0,
        "color": "#000000"
      },
      "S": {
        "symbol": "S",
        "role": "STEEL",
        "hp": 9999,
        "color": "#9aa4b2"
      },
      "R": {
        "symbol": "R",
        "role": "NORMAL",
        "hp": 1,
        "color": "#ef1d1d"
      },
      "G": {
        "symbol": "G",
        "role": "NORMAL",
        "hp": 1,
        "color": "#41b06e"
      },
      "B": {
        "symbol": "B",
        "role": "NORMAL",
        "hp": 1,
        "color": "#2f6fed"
      },
      "Y": {
        "symbol": "Y",
        "role": "NORMAL",
        "hp": 1,
        "color": "#f4b740"
      },
      "P": {
        "symbol": "P",
        "role": "NORMAL",
        "hp": 1,
        "color": "#b06ab3"
      },
      "C": {
        "symbol": "C",
        "role": "NORMAL",
        "hp": 1,
        "color": "#4ecdc4"
      },
      "O": {
        "symbol": "O",
        "role": "NORMAL",
        "hp": 1,
        "color": "#ff7b54"
      },
      "D": {
        "symbol": "D",
        "role": "NORMAL",
        "hp": 2,
        "color": "#f4b740"
      },
      "E": {
        "symbol": "E",
        "role": "NORMAL",
        "hp": 3,
        "color": "#b06ab3"
      },
      "F": {
        "symbol": "F",
        "role": "NORMAL",
        "hp": 4,
        "color": "#ff7b54"
      },
      "M": {
        "symbol": "M",
        "role": "BOMB",
        "hp": 1,
        "color": "#111111"
      },
      "L": {
        "symbol": "L",
        "role": "PRISM",
        "hp": 1,
        "color": "#7dd3fc"
      },
      "K": {
        "symbol": "K",
        "role": "CORE",
        "hp": 5,
        "color": "#f59e0b"
      },
      "A": {
        "symbol": "A",
        "role": "NORMAL",
        "hp": 2,
        "color": "#2f6fed"
      },
      "H": {
        "symbol": "H",
        "role": "NORMAL",
        "hp": 2,
        "color": "#ef1d1d"
      },
      "I": {
        "symbol": "I",
        "role": "NORMAL",
        "hp": 2,
        "color": "#4ecdc4"
      },
      "J": {
        "symbol": "J",
        "role": "NORMAL",
        "hp": 2,
        "color": "#b06ab3"
      },
      "N": {
        "symbol": "N",
        "role": "NORMAL",
        "hp": 2,
        "color": "#ff7b54"
      }
    },
    "rleGrid": "42.|42.|17.2Y4.2Y17.|18.Y4.Y18.|42.|11.2D.R12.R.2D11.|10.3D2R2.AH4.HA2.2R3D10.|9.3D2IR2.2A4.2A2.R2I3D9.|11.3I4.J4.J4.3I11.|10.2RI4.IJ4.JI4.I2R10.|11.R3.P2.I4.I2.P3.R11.|15.2P8.2P15.|13.I2.2R6.2R2.I13.|6.3Y2.2AJI2.RN4.NR2.IJ2A2.3Y6.|6.2Y2.3HAJ2.IN4.NI2.JA3H2.2Y6.|6.2J6.A2.2O4.2O2.A6.2J6.|6.2J26.2J6.|6.2J5.2A2.OI4.IO2.2A5.2J6.|6.2Y3.2H2J2.PN4.NP2.2J2H3.2Y6.|6.3Y2.2AJI2.RN4.NR2.IJ2A2.3Y6.|13.I2.2R6.2R2.I13.|14.3P8.3P14.|11.R3.P2.J4.J2.P3.R11.|10.2RI4.IJ4.JI4.I2R10.|11.3I4.J4.J4.3I11.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.",
    "mechanics": {
      "initialSkills": {
        "multiLaunch": 3,
        "tripleSplit": 2
      }
    },
    "difficultyScore": {
      "totalScore": 15,
      "tier": "EASY",
      "breakableCount": 208,
      "steelOcclusionRatio": 0,
      "simBreakRate20s": 0.7704326923076923,
      "hasDeadZoneWarning": false
    }
  },
  {
    "version": 1,
    "id": "builtin-03",
    "name": "精选关卡 03",
    "cols": 42,
    "rows": 38,
    "palette": {
      ".": {
        "symbol": ".",
        "role": "EMPTY",
        "hp": 0,
        "color": "#000000"
      },
      "S": {
        "symbol": "S",
        "role": "STEEL",
        "hp": 9999,
        "color": "#9aa4b2"
      },
      "R": {
        "symbol": "R",
        "role": "NORMAL",
        "hp": 1,
        "color": "#ef1d1d"
      },
      "G": {
        "symbol": "G",
        "role": "NORMAL",
        "hp": 1,
        "color": "#41b06e"
      },
      "B": {
        "symbol": "B",
        "role": "NORMAL",
        "hp": 1,
        "color": "#2f6fed"
      },
      "Y": {
        "symbol": "Y",
        "role": "NORMAL",
        "hp": 1,
        "color": "#f4b740"
      },
      "P": {
        "symbol": "P",
        "role": "NORMAL",
        "hp": 1,
        "color": "#b06ab3"
      },
      "C": {
        "symbol": "C",
        "role": "NORMAL",
        "hp": 1,
        "color": "#4ecdc4"
      },
      "O": {
        "symbol": "O",
        "role": "NORMAL",
        "hp": 1,
        "color": "#ff7b54"
      },
      "D": {
        "symbol": "D",
        "role": "NORMAL",
        "hp": 2,
        "color": "#f4b740"
      },
      "E": {
        "symbol": "E",
        "role": "NORMAL",
        "hp": 3,
        "color": "#b06ab3"
      },
      "F": {
        "symbol": "F",
        "role": "NORMAL",
        "hp": 4,
        "color": "#ff7b54"
      },
      "M": {
        "symbol": "M",
        "role": "BOMB",
        "hp": 1,
        "color": "#111111"
      },
      "L": {
        "symbol": "L",
        "role": "PRISM",
        "hp": 1,
        "color": "#7dd3fc"
      },
      "K": {
        "symbol": "K",
        "role": "CORE",
        "hp": 5,
        "color": "#f59e0b"
      },
      "A": {
        "symbol": "A",
        "role": "NORMAL",
        "hp": 2,
        "color": "#b06ab3"
      },
      "H": {
        "symbol": "H",
        "role": "NORMAL",
        "hp": 2,
        "color": "#41b06e"
      },
      "I": {
        "symbol": "I",
        "role": "NORMAL",
        "hp": 2,
        "color": "#4ecdc4"
      },
      "J": {
        "symbol": "J",
        "role": "NORMAL",
        "hp": 2,
        "color": "#ff7b54"
      }
    },
    "rleGrid": "42.|42.|16.3D4.3D16.|14.5D4.5D14.|14.2D2.P4.P2.2D14.|14.A3.P4.P3.A14.|13.2A3.H4.H3.2A13.|12.3AH10.H3A12.|11.2OA2H2.I4.I2.2HA2O11.|10.3OD2HO2I4.2IO2HD3O10.|11.O3D3OI4.I3O3DO11.|12.2D2POPO4.OPO2P2D12.|11.2J.2P.2P4.2P.2P.2J11.|11.2J2.G2.O4.O2.G2.2J11.|10.3CI.2G.R4.R.2G.I3C10.|10.3C2I2D8.2D2I3C10.|10.2C3I2D2Y4.2Y2D3I2C10.|10.3C2I2D8.2D2I3C10.|11.2C2.2G2R4.2R2G2.2C11.|11.2J2.G2.O4.O2.G2.2J11.|11.2J.2P.2P4.2P.2P.2J11.|12.2D2POPO4.OPO2P2D12.|11.O3D3OI4.I3O3DO11.|10.3OD2HO2I4.2IO2HD3O10.|11.2OA2H2.I4.I2.2HA2O11.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.",
    "mechanics": {
      "initialSkills": {
        "multiLaunch": 3,
        "tripleSplit": 2
      }
    },
    "difficultyScore": {
      "totalScore": 16,
      "tier": "EASY",
      "breakableCount": 272,
      "steelOcclusionRatio": 0,
      "simBreakRate20s": 0.46001838235294124,
      "hasDeadZoneWarning": false
    }
  },
  {
    "version": 1,
    "id": "builtin-04",
    "name": "精选关卡 04",
    "cols": 42,
    "rows": 38,
    "palette": {
      ".": {
        "symbol": ".",
        "role": "EMPTY",
        "hp": 0,
        "color": "#000000"
      },
      "S": {
        "symbol": "S",
        "role": "STEEL",
        "hp": 9999,
        "color": "#9aa4b2"
      },
      "R": {
        "symbol": "R",
        "role": "NORMAL",
        "hp": 1,
        "color": "#ef1d1d"
      },
      "G": {
        "symbol": "G",
        "role": "NORMAL",
        "hp": 1,
        "color": "#41b06e"
      },
      "B": {
        "symbol": "B",
        "role": "NORMAL",
        "hp": 1,
        "color": "#2f6fed"
      },
      "Y": {
        "symbol": "Y",
        "role": "NORMAL",
        "hp": 1,
        "color": "#f4b740"
      },
      "P": {
        "symbol": "P",
        "role": "NORMAL",
        "hp": 1,
        "color": "#b06ab3"
      },
      "C": {
        "symbol": "C",
        "role": "NORMAL",
        "hp": 1,
        "color": "#4ecdc4"
      },
      "O": {
        "symbol": "O",
        "role": "NORMAL",
        "hp": 1,
        "color": "#ff7b54"
      },
      "D": {
        "symbol": "D",
        "role": "NORMAL",
        "hp": 2,
        "color": "#f4b740"
      },
      "E": {
        "symbol": "E",
        "role": "NORMAL",
        "hp": 3,
        "color": "#b06ab3"
      },
      "F": {
        "symbol": "F",
        "role": "NORMAL",
        "hp": 4,
        "color": "#ff7b54"
      },
      "M": {
        "symbol": "M",
        "role": "BOMB",
        "hp": 1,
        "color": "#111111"
      },
      "L": {
        "symbol": "L",
        "role": "PRISM",
        "hp": 1,
        "color": "#7dd3fc"
      },
      "K": {
        "symbol": "K",
        "role": "CORE",
        "hp": 5,
        "color": "#f59e0b"
      },
      "A": {
        "symbol": "A",
        "role": "NORMAL",
        "hp": 2,
        "color": "#b06ab3"
      },
      "H": {
        "symbol": "H",
        "role": "NORMAL",
        "hp": 2,
        "color": "#41b06e"
      },
      "I": {
        "symbol": "I",
        "role": "NORMAL",
        "hp": 2,
        "color": "#4ecdc4"
      },
      "J": {
        "symbol": "J",
        "role": "NORMAL",
        "hp": 2,
        "color": "#ff7b54"
      }
    },
    "rleGrid": "42.|42.|16.A8.A16.|16.2A6.2A16.|12.2Y2.2A6.2A2.2Y12.|13.2Y12.2Y13.|13.2Y2G8.2G2Y13.|13.G2YG8.G2YG13.|8.3Y.3GYG2H4.2HGY3G.3Y8.|9.3Y3GAI2H4.2HIA3G3Y9.|11.2YG2A2IH4.H2I2AG2Y11.|7.2A.2G2YI2AIC4.CI2AI2Y2G.2A7.|7.3A.2GH2IADO4.ODA2IH2G.3A7.|13.3HO2D4.2DO3H13.|14.HG2CD4.D2CGH14.|6.3R3B3.2JGB4.BG2J3.3B3R6.|6.3R3B3.3DI4.I3D3.3B3R6.|6.3R3B3.2JG6.G2J3.3B3R6.|13.2HGCOD4.DOCG2H13.|13.3HO2D4.2DO3H13.|7.3A.2GH2IADO4.ODA2IH2G.3A7.|7.2A.2G2Y3AIC4.CI3A2Y2G.2A7.|11.2YG2A2IH4.H2I2AG2Y11.|9.3Y3GAI2H4.2HIA3G3Y9.|8.3Y.3GYG2H4.2HGY3G.3Y8.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.",
    "mechanics": {
      "initialSkills": {
        "multiLaunch": 3,
        "tripleSplit": 2
      }
    },
    "difficultyScore": {
      "totalScore": 17,
      "tier": "EASY",
      "breakableCount": 338,
      "steelOcclusionRatio": 0,
      "simBreakRate20s": 0.4571005917159763,
      "hasDeadZoneWarning": false
    }
  },
  {
    "version": 1,
    "id": "builtin-05",
    "name": "精选关卡 05",
    "cols": 42,
    "rows": 38,
    "palette": {
      ".": {
        "symbol": ".",
        "role": "EMPTY",
        "hp": 0,
        "color": "#000000"
      },
      "S": {
        "symbol": "S",
        "role": "STEEL",
        "hp": 9999,
        "color": "#9aa4b2"
      },
      "R": {
        "symbol": "R",
        "role": "NORMAL",
        "hp": 1,
        "color": "#ef1d1d"
      },
      "G": {
        "symbol": "G",
        "role": "NORMAL",
        "hp": 1,
        "color": "#41b06e"
      },
      "B": {
        "symbol": "B",
        "role": "NORMAL",
        "hp": 1,
        "color": "#2f6fed"
      },
      "Y": {
        "symbol": "Y",
        "role": "NORMAL",
        "hp": 1,
        "color": "#f4b740"
      },
      "P": {
        "symbol": "P",
        "role": "NORMAL",
        "hp": 1,
        "color": "#b06ab3"
      },
      "C": {
        "symbol": "C",
        "role": "NORMAL",
        "hp": 1,
        "color": "#4ecdc4"
      },
      "O": {
        "symbol": "O",
        "role": "NORMAL",
        "hp": 1,
        "color": "#ff7b54"
      },
      "D": {
        "symbol": "D",
        "role": "NORMAL",
        "hp": 2,
        "color": "#f4b740"
      },
      "E": {
        "symbol": "E",
        "role": "NORMAL",
        "hp": 3,
        "color": "#b06ab3"
      },
      "F": {
        "symbol": "F",
        "role": "NORMAL",
        "hp": 4,
        "color": "#ff7b54"
      },
      "M": {
        "symbol": "M",
        "role": "BOMB",
        "hp": 1,
        "color": "#111111"
      },
      "L": {
        "symbol": "L",
        "role": "PRISM",
        "hp": 1,
        "color": "#7dd3fc"
      },
      "K": {
        "symbol": "K",
        "role": "CORE",
        "hp": 5,
        "color": "#f59e0b"
      },
      "A": {
        "symbol": "A",
        "role": "NORMAL",
        "hp": 2,
        "color": "#b06ab3"
      },
      "H": {
        "symbol": "H",
        "role": "NORMAL",
        "hp": 2,
        "color": "#41b06e"
      },
      "I": {
        "symbol": "I",
        "role": "NORMAL",
        "hp": 2,
        "color": "#ef1d1d"
      },
      "J": {
        "symbol": "J",
        "role": "NORMAL",
        "hp": 2,
        "color": "#2f6fed"
      },
      "N": {
        "symbol": "N",
        "role": "NORMAL",
        "hp": 2,
        "color": "#4ecdc4"
      }
    },
    "rleGrid": "42.|42.|16.A8.A16.|14.2C2A6.2A2C14.|12.2A2C2A6.2A2C2A12.|11.2G2AC2PA4.A2PC2A2G11.|10.3GA.2CPA4.AP2C.A3G10.|9.4G3.C2P4.2PC3.4G9.|8.3AG4.CH6.HC4.G3A8.|8.C2A4.HIH6.HIH4.2AC8.|7.4C3.2H2IH4.H2I2H3.4C7.|7.2A3C2.I2HIJ4.JI2HI2.3C2A7.|7.3AP2CH2IHCJ4.JCH2IH2CP3A7.|9.A3P.2HJ2C4.2CJ2H.3PA9.|9.3A2C.R2JC4.C2JR.2C3A9.|6.3A3N2.C2.R6.R2.C2.3N3A6.|6.3A3N3.3Y6.3Y3.3N3A6.|6.3A3N.2C2.RI4.IR2.2C.3N3A6.|9.3AC2.R2JC4.C2JR2.C3A9.|9.A3P.2HJ2C4.2CJ2H.3PA9.|7.3AP2CH2IHCJ4.JCH2IH2CP3A7.|7.2A3C2.3HIJ4.JI3H2.3C2A7.|7.4C3.2H2I6.2I2H3.4C7.|8.C2A4.HIH6.HIH4.2AC8.|8.3AG4.CH6.HC4.G3A8.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.",
    "mechanics": {
      "initialSkills": {
        "multiLaunch": 3,
        "tripleSplit": 2
      }
    },
    "difficultyScore": {
      "totalScore": 29,
      "tier": "EASY",
      "breakableCount": 362,
      "steelOcclusionRatio": 0,
      "simBreakRate20s": 0.22720994475138123,
      "hasDeadZoneWarning": false
    }
  },
  {
    "version": 1,
    "id": "builtin-06",
    "name": "精选关卡 06",
    "cols": 42,
    "rows": 38,
    "palette": {
      ".": {
        "symbol": ".",
        "role": "EMPTY",
        "hp": 0,
        "color": "#000000"
      },
      "S": {
        "symbol": "S",
        "role": "STEEL",
        "hp": 9999,
        "color": "#9aa4b2"
      },
      "R": {
        "symbol": "R",
        "role": "NORMAL",
        "hp": 1,
        "color": "#ef1d1d"
      },
      "G": {
        "symbol": "G",
        "role": "NORMAL",
        "hp": 1,
        "color": "#41b06e"
      },
      "B": {
        "symbol": "B",
        "role": "NORMAL",
        "hp": 1,
        "color": "#2f6fed"
      },
      "Y": {
        "symbol": "Y",
        "role": "NORMAL",
        "hp": 1,
        "color": "#f4b740"
      },
      "P": {
        "symbol": "P",
        "role": "NORMAL",
        "hp": 1,
        "color": "#b06ab3"
      },
      "C": {
        "symbol": "C",
        "role": "NORMAL",
        "hp": 1,
        "color": "#4ecdc4"
      },
      "O": {
        "symbol": "O",
        "role": "NORMAL",
        "hp": 1,
        "color": "#ff7b54"
      },
      "D": {
        "symbol": "D",
        "role": "NORMAL",
        "hp": 2,
        "color": "#f4b740"
      },
      "E": {
        "symbol": "E",
        "role": "NORMAL",
        "hp": 3,
        "color": "#b06ab3"
      },
      "F": {
        "symbol": "F",
        "role": "NORMAL",
        "hp": 4,
        "color": "#ff7b54"
      },
      "M": {
        "symbol": "M",
        "role": "BOMB",
        "hp": 1,
        "color": "#111111"
      },
      "L": {
        "symbol": "L",
        "role": "PRISM",
        "hp": 1,
        "color": "#7dd3fc"
      },
      "K": {
        "symbol": "K",
        "role": "CORE",
        "hp": 5,
        "color": "#f59e0b"
      },
      "A": {
        "symbol": "A",
        "role": "NORMAL",
        "hp": 2,
        "color": "#b06ab3"
      },
      "H": {
        "symbol": "H",
        "role": "NORMAL",
        "hp": 2,
        "color": "#41b06e"
      },
      "I": {
        "symbol": "I",
        "role": "NORMAL",
        "hp": 2,
        "color": "#4ecdc4"
      },
      "J": {
        "symbol": "J",
        "role": "NORMAL",
        "hp": 2,
        "color": "#ff7b54"
      },
      "N": {
        "symbol": "N",
        "role": "NORMAL",
        "hp": 2,
        "color": "#2f6fed"
      }
    },
    "rleGrid": "42.|42.|16.3S4.3S16.|16.SDS4.SDS16.|12.2S2.3D4.3D2.2S12.|11.SAPS12.SPAS11.|10.S2APH2S8.2SHP2AS10.|9.S3AI2HS8.S2HI3AS9.|8.3PA3IHS.S4.S.SH3IA3P8.|9.2PH3I.S.D4.D.S.3IH2P9.|11.RHI2.GS6.SG2.IHR11.|7.2S.2O2HG2.GP4.PG2.G2H2O.2S7.|7.S2D.2O.2G.JO4.OJ.2G.2O.2DS7.|6.S2D4.D2.O2J4.2JO2.D4.2DS6.|6.3D3.2ODO2PJ4.J2POD2O3.3D6.|9.S2H2NO2.OI4.IO2.O2N2HS9.|9.S2H3N3P6.3P3N2HS9.|9.3HN2O2.OG4.GO2.2ON3H9.|6.3S3.O2DOPOJ4.JOPO2DO3.3S6.|6.3D4.D2.O2J4.2JO2.D4.3D6.|7.R2D.2O.2G.JO4.OJ.2G.2O.2DR7.|7.2D.2O2H3.GP4.PG3.2H2O.2D7.|11.RHI2.2GD4.D2G2.IHR11.|9.2SH3I.R.R4.R.R.3IH2S9.|8.3PA3IHO.D4.D.OH3IA3P8.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.",
    "mechanics": {
      "initialSkills": {
        "multiLaunch": 3,
        "tripleSplit": 2
      }
    },
    "difficultyScore": {
      "totalScore": 37,
      "tier": "MEDIUM",
      "breakableCount": 284,
      "steelOcclusionRatio": 1,
      "simBreakRate20s": 0.22359154929577466,
      "hasDeadZoneWarning": false
    }
  },
  {
    "version": 1,
    "id": "builtin-07",
    "name": "精选关卡 07",
    "cols": 42,
    "rows": 38,
    "palette": {
      ".": {
        "symbol": ".",
        "role": "EMPTY",
        "hp": 0,
        "color": "#000000"
      },
      "S": {
        "symbol": "S",
        "role": "STEEL",
        "hp": 9999,
        "color": "#9aa4b2"
      },
      "R": {
        "symbol": "R",
        "role": "NORMAL",
        "hp": 1,
        "color": "#ef1d1d"
      },
      "G": {
        "symbol": "G",
        "role": "NORMAL",
        "hp": 1,
        "color": "#41b06e"
      },
      "B": {
        "symbol": "B",
        "role": "NORMAL",
        "hp": 1,
        "color": "#2f6fed"
      },
      "Y": {
        "symbol": "Y",
        "role": "NORMAL",
        "hp": 1,
        "color": "#f4b740"
      },
      "P": {
        "symbol": "P",
        "role": "NORMAL",
        "hp": 1,
        "color": "#b06ab3"
      },
      "C": {
        "symbol": "C",
        "role": "NORMAL",
        "hp": 1,
        "color": "#4ecdc4"
      },
      "O": {
        "symbol": "O",
        "role": "NORMAL",
        "hp": 1,
        "color": "#ff7b54"
      },
      "D": {
        "symbol": "D",
        "role": "NORMAL",
        "hp": 2,
        "color": "#f4b740"
      },
      "E": {
        "symbol": "E",
        "role": "NORMAL",
        "hp": 3,
        "color": "#b06ab3"
      },
      "F": {
        "symbol": "F",
        "role": "NORMAL",
        "hp": 4,
        "color": "#ff7b54"
      },
      "M": {
        "symbol": "M",
        "role": "BOMB",
        "hp": 1,
        "color": "#111111"
      },
      "L": {
        "symbol": "L",
        "role": "PRISM",
        "hp": 1,
        "color": "#7dd3fc"
      },
      "K": {
        "symbol": "K",
        "role": "CORE",
        "hp": 5,
        "color": "#f59e0b"
      },
      "A": {
        "symbol": "A",
        "role": "NORMAL",
        "hp": 2,
        "color": "#b06ab3"
      },
      "H": {
        "symbol": "H",
        "role": "NORMAL",
        "hp": 2,
        "color": "#4ecdc4"
      },
      "I": {
        "symbol": "I",
        "role": "NORMAL",
        "hp": 2,
        "color": "#2f6fed"
      },
      "J": {
        "symbol": "J",
        "role": "NORMAL",
        "hp": 2,
        "color": "#ef1d1d"
      }
    },
    "rleGrid": "42.|42.|17.YS4.SY17.|18.S4.S18.|12.2S4.Y4.Y4.2S12.|11.S3A12.3AS11.|11.3A14.3A11.|12.R16.R12.|12.R4.2S4.2S4.R12.|8.S2.SDS.RS2R4.2R2S.RDS2.S8.|7.SH2S3DS3IR4.R3IS3D2SHS7.|7.S4H2D2J2I6.2I2J2D4HS7.|7.S5HR3J8.3JR5HS7.|6.S2AI3H3R10.3R3HI2AS6.|6.S2A3I2.R3H6.3HR2.3I2AS6.|6.S2A3I3.2IH6.H2I3.3I2AS6.|6.S2A3I3.3I6.3I3.3I2AS6.|6.S2A3I3.2IH6.H2I3.3I2AS6.|6.S2A3I.2R2H8.2H2R.3I2AS6.|6.3AI3H3R10.3R3HI3A6.|7.R5HR3J8.3JR5HR7.|7.R4H2D2J2I6.2I2J2D4HR7.|7.4H3DJ3IR4.R3IJ3D4H7.|8.H2.3D.2I2R4.2R2I.3D2.H8.|12.D4.2R4.2R4.D12.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.",
    "mechanics": {
      "initialSkills": {
        "multiLaunch": 3,
        "tripleSplit": 2
      }
    },
    "difficultyScore": {
      "totalScore": 40,
      "tier": "MEDIUM",
      "breakableCount": 292,
      "steelOcclusionRatio": 1,
      "simBreakRate20s": 0.22089041095890413,
      "hasDeadZoneWarning": false
    }
  },
  {
    "version": 1,
    "id": "builtin-08",
    "name": "精选关卡 08",
    "cols": 42,
    "rows": 38,
    "palette": {
      ".": {
        "symbol": ".",
        "role": "EMPTY",
        "hp": 0,
        "color": "#000000"
      },
      "S": {
        "symbol": "S",
        "role": "STEEL",
        "hp": 9999,
        "color": "#9aa4b2"
      },
      "R": {
        "symbol": "R",
        "role": "NORMAL",
        "hp": 1,
        "color": "#ef1d1d"
      },
      "G": {
        "symbol": "G",
        "role": "NORMAL",
        "hp": 1,
        "color": "#41b06e"
      },
      "B": {
        "symbol": "B",
        "role": "NORMAL",
        "hp": 1,
        "color": "#2f6fed"
      },
      "Y": {
        "symbol": "Y",
        "role": "NORMAL",
        "hp": 1,
        "color": "#f4b740"
      },
      "P": {
        "symbol": "P",
        "role": "NORMAL",
        "hp": 1,
        "color": "#b06ab3"
      },
      "C": {
        "symbol": "C",
        "role": "NORMAL",
        "hp": 1,
        "color": "#4ecdc4"
      },
      "O": {
        "symbol": "O",
        "role": "NORMAL",
        "hp": 1,
        "color": "#ff7b54"
      },
      "D": {
        "symbol": "D",
        "role": "NORMAL",
        "hp": 2,
        "color": "#f4b740"
      },
      "E": {
        "symbol": "E",
        "role": "NORMAL",
        "hp": 3,
        "color": "#b06ab3"
      },
      "F": {
        "symbol": "F",
        "role": "NORMAL",
        "hp": 4,
        "color": "#ff7b54"
      },
      "M": {
        "symbol": "M",
        "role": "BOMB",
        "hp": 1,
        "color": "#111111"
      },
      "L": {
        "symbol": "L",
        "role": "PRISM",
        "hp": 1,
        "color": "#7dd3fc"
      },
      "K": {
        "symbol": "K",
        "role": "CORE",
        "hp": 5,
        "color": "#f59e0b"
      },
      "A": {
        "symbol": "A",
        "role": "NORMAL",
        "hp": 2,
        "color": "#b06ab3"
      },
      "H": {
        "symbol": "H",
        "role": "NORMAL",
        "hp": 2,
        "color": "#2f6fed"
      },
      "I": {
        "symbol": "I",
        "role": "NORMAL",
        "hp": 2,
        "color": "#ef1d1d"
      },
      "J": {
        "symbol": "J",
        "role": "NORMAL",
        "hp": 2,
        "color": "#41b06e"
      },
      "N": {
        "symbol": "N",
        "role": "NORMAL",
        "hp": 2,
        "color": "#4ecdc4"
      },
      "Q": {
        "symbol": "Q",
        "role": "NORMAL",
        "hp": 2,
        "color": "#ff7b54"
      }
    },
    "rleGrid": "42.|42.|17.RS4.SR17.|18.S4.S18.|12.YS2.2SD4.D2S2.SY12.|13.3S2AD4.D2A3S13.|13.SR2H.I4.I.2HRS13.|12.SGRIJ8.JIRGS12.|8.Y3S2GOI2J6.2JIO2G3SY8.|9.Y2RG3O.P6.P.3OG2RY9.|10.2RI2O3.P4.P3.2OI2R10.|9.S2H2I3.JH4.HJ3.2I2HS9.|9.SA2JP2.2NJ4.J2N2.P2JAS9.|6.3SDA3.PHJNB4.BNJHP3.AD3S6.|6.SR2D3IC.CHNB4.BNHC.C3I2DRS6.|6.SY2.3GRC2.2Q4.2Q2.CR3G2.YS6.|6.SY2.2G3R2.2R4.2R2.3R2G2.YS6.|6.SY2.3G2C2.QN4.NQ2.2C3G2.YS6.|6.SR3D2I2.CHRB4.BRHC2.2I3DRS6.|6.3RDA3.PHJNB4.BNJHP3.AD3R6.|9.RA2JS2.2NJ4.J2N2.S2JAR9.|9.3HIS3.JH4.HJ3.SI3H9.|10.2RIOS12.SOI2R10.|9.S2RG2OS.S6.S.S2OG2RS9.|8.3Y3GOI2J6.2JIO3G3Y8.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.",
    "mechanics": {
      "initialSkills": {
        "multiLaunch": 3,
        "tripleSplit": 2
      }
    },
    "difficultyScore": {
      "totalScore": 44,
      "tier": "MEDIUM",
      "breakableCount": 284,
      "steelOcclusionRatio": 1,
      "simBreakRate20s": 0.19102112676056338,
      "hasDeadZoneWarning": false
    }
  },
  {
    "version": 1,
    "id": "builtin-09",
    "name": "精选关卡 09",
    "cols": 42,
    "rows": 38,
    "palette": {
      ".": {
        "symbol": ".",
        "role": "EMPTY",
        "hp": 0,
        "color": "#000000"
      },
      "S": {
        "symbol": "S",
        "role": "STEEL",
        "hp": 9999,
        "color": "#9aa4b2"
      },
      "R": {
        "symbol": "R",
        "role": "NORMAL",
        "hp": 1,
        "color": "#ef1d1d"
      },
      "G": {
        "symbol": "G",
        "role": "NORMAL",
        "hp": 1,
        "color": "#41b06e"
      },
      "B": {
        "symbol": "B",
        "role": "NORMAL",
        "hp": 1,
        "color": "#2f6fed"
      },
      "Y": {
        "symbol": "Y",
        "role": "NORMAL",
        "hp": 1,
        "color": "#f4b740"
      },
      "P": {
        "symbol": "P",
        "role": "NORMAL",
        "hp": 1,
        "color": "#b06ab3"
      },
      "C": {
        "symbol": "C",
        "role": "NORMAL",
        "hp": 1,
        "color": "#4ecdc4"
      },
      "O": {
        "symbol": "O",
        "role": "NORMAL",
        "hp": 1,
        "color": "#ff7b54"
      },
      "D": {
        "symbol": "D",
        "role": "NORMAL",
        "hp": 2,
        "color": "#f4b740"
      },
      "E": {
        "symbol": "E",
        "role": "NORMAL",
        "hp": 3,
        "color": "#b06ab3"
      },
      "F": {
        "symbol": "F",
        "role": "NORMAL",
        "hp": 4,
        "color": "#ff7b54"
      },
      "M": {
        "symbol": "M",
        "role": "BOMB",
        "hp": 1,
        "color": "#111111"
      },
      "L": {
        "symbol": "L",
        "role": "PRISM",
        "hp": 1,
        "color": "#7dd3fc"
      },
      "K": {
        "symbol": "K",
        "role": "CORE",
        "hp": 5,
        "color": "#f59e0b"
      },
      "A": {
        "symbol": "A",
        "role": "NORMAL",
        "hp": 2,
        "color": "#b06ab3"
      },
      "H": {
        "symbol": "H",
        "role": "NORMAL",
        "hp": 2,
        "color": "#41b06e"
      },
      "I": {
        "symbol": "I",
        "role": "NORMAL",
        "hp": 2,
        "color": "#4ecdc4"
      },
      "J": {
        "symbol": "J",
        "role": "NORMAL",
        "hp": 2,
        "color": "#2f6fed"
      },
      "N": {
        "symbol": "N",
        "role": "NORMAL",
        "hp": 2,
        "color": "#ff7b54"
      }
    },
    "rleGrid": "42.|42.|16.3S4.3S16.|14.2S3D4.3D2S14.|14.5D4.5D14.|15.R2YP4.P2YR15.|10.S4.3YP4.P3Y4.S10.|9.SAS4.R2Y4.2YR4.SAS9.|8.S3AS3.RHR4.RHR3.S3AS8.|8.S2A2HS.RIHR4.RHIS.R2H2AS8.|7.S3O3HS3IR4.R3IS3H3OS7.|7.S2O2D2H2J2IO4.O2I2J2H2D2OS7.|7.S2O3D.3J2G4.2G3J.3D2OS7.|6.S3P3D3.2OG4.G2O3.3D3PS6.|6.S5P2N.3OR4.R3O.2N5PS6.|6.S5P3N2COI4.IO2C3N5PS6.|6.S5P3N2CR6.R2C3N5PS6.|6.S5P3N2COS4.SO2C3N5PS6.|6.S5PN2.3OS4.S3O2.N5PS6.|6.4P3D3.2OG4.G2O3.3D4P6.|7.R2O3D.3J2G4.2G3J.3D2OR7.|7.R2O2D2H2J2IO4.O2I2J2H2D2OR7.|7.4O3HJ3IR4.R3IJ3H4O7.|8.R2A3H.2IHR4.RH2I.3H2AR8.|8.4AH3.Y2H4.2HY3.H4A8.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.",
    "mechanics": {
      "initialSkills": {
        "multiLaunch": 3,
        "tripleSplit": 2
      }
    },
    "difficultyScore": {
      "totalScore": 46,
      "tier": "MEDIUM",
      "breakableCount": 382,
      "steelOcclusionRatio": 1,
      "simBreakRate20s": 0.19175392670157068,
      "hasDeadZoneWarning": false
    }
  },
  {
    "version": 1,
    "id": "builtin-10",
    "name": "精选关卡 10",
    "cols": 42,
    "rows": 38,
    "palette": {
      ".": {
        "symbol": ".",
        "role": "EMPTY",
        "hp": 0,
        "color": "#000000"
      },
      "S": {
        "symbol": "S",
        "role": "STEEL",
        "hp": 9999,
        "color": "#9aa4b2"
      },
      "R": {
        "symbol": "R",
        "role": "NORMAL",
        "hp": 1,
        "color": "#ef1d1d"
      },
      "G": {
        "symbol": "G",
        "role": "NORMAL",
        "hp": 1,
        "color": "#41b06e"
      },
      "B": {
        "symbol": "B",
        "role": "NORMAL",
        "hp": 1,
        "color": "#2f6fed"
      },
      "Y": {
        "symbol": "Y",
        "role": "NORMAL",
        "hp": 1,
        "color": "#f4b740"
      },
      "P": {
        "symbol": "P",
        "role": "NORMAL",
        "hp": 1,
        "color": "#b06ab3"
      },
      "C": {
        "symbol": "C",
        "role": "NORMAL",
        "hp": 1,
        "color": "#4ecdc4"
      },
      "O": {
        "symbol": "O",
        "role": "NORMAL",
        "hp": 1,
        "color": "#ff7b54"
      },
      "D": {
        "symbol": "D",
        "role": "NORMAL",
        "hp": 2,
        "color": "#f4b740"
      },
      "E": {
        "symbol": "E",
        "role": "NORMAL",
        "hp": 3,
        "color": "#b06ab3"
      },
      "F": {
        "symbol": "F",
        "role": "NORMAL",
        "hp": 4,
        "color": "#ff7b54"
      },
      "M": {
        "symbol": "M",
        "role": "BOMB",
        "hp": 1,
        "color": "#111111"
      },
      "L": {
        "symbol": "L",
        "role": "PRISM",
        "hp": 1,
        "color": "#7dd3fc"
      },
      "K": {
        "symbol": "K",
        "role": "CORE",
        "hp": 5,
        "color": "#f59e0b"
      },
      "A": {
        "symbol": "A",
        "role": "NORMAL",
        "hp": 2,
        "color": "#b06ab3"
      },
      "H": {
        "symbol": "H",
        "role": "NORMAL",
        "hp": 2,
        "color": "#2f6fed"
      },
      "I": {
        "symbol": "I",
        "role": "NORMAL",
        "hp": 2,
        "color": "#ef1d1d"
      },
      "J": {
        "symbol": "J",
        "role": "NORMAL",
        "hp": 2,
        "color": "#41b06e"
      },
      "N": {
        "symbol": "N",
        "role": "NORMAL",
        "hp": 2,
        "color": "#4ecdc4"
      },
      "Q": {
        "symbol": "Q",
        "role": "NORMAL",
        "hp": 2,
        "color": "#ff7b54"
      }
    },
    "rleGrid": "42.|42.|17.RS4.SR17.|18.S4.S18.|12.2S4.S4.S4.2S12.|11.S2YS3.Y4.Y3.S2YS11.|10.S2YAS12.SA2YS10.|9.S2D3AS10.S3A2DS9.|8.3D2HARS10.SRA2H3D8.|9.D3HG2RS8.S2RG3HD9.|10.RH3G2IS6.S2I3GHR10.|9.S2J2G2.ICS4.SCI2.2G2JS9.|9.SJ2.P3.2C4.2C3.P2.JS9.|6.3SHJ2.2PC2.N4.N2.C2P2.JH3S6.|6.SJ2H3QRP2CBN4.NB2CPR3Q2HJS6.|6.SJ2H3Q4R2B4.2B4R3Q2HJS6.|6.SJ2H2Q5R2C4.2C5R2Q2HJS6.|6.SJ2H3Q4R2B4.2B4R3Q2HJS6.|6.SJ3H2Q2P2C2N4.2N2C2P2Q3HJS6.|6.3JHJ2.2PC2.N4.N2.C2P2.JH3J6.|9.RJ2.P3.2C4.2C3.P2.JR9.|9.3J2G2.ICR4.RCI2.2G3J9.|10.RH3G3I6.3I3GHR10.|9.S3HG2RI8.I2RG3HS9.|8.3D2HA2R10.2RA2H3D8.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.",
    "mechanics": {
      "initialSkills": {
        "multiLaunch": 3,
        "tripleSplit": 2
      }
    },
    "difficultyScore": {
      "totalScore": 53,
      "tier": "MEDIUM",
      "breakableCount": 308,
      "steelOcclusionRatio": 1,
      "simBreakRate20s": 0.15665584415584416,
      "hasDeadZoneWarning": false
    }
  },
  {
    "version": 1,
    "id": "builtin-11",
    "name": "精选关卡 11",
    "cols": 42,
    "rows": 38,
    "palette": {
      ".": {
        "symbol": ".",
        "role": "EMPTY",
        "hp": 0,
        "color": "#000000"
      },
      "S": {
        "symbol": "S",
        "role": "STEEL",
        "hp": 9999,
        "color": "#9aa4b2"
      },
      "R": {
        "symbol": "R",
        "role": "NORMAL",
        "hp": 1,
        "color": "#ef1d1d"
      },
      "G": {
        "symbol": "G",
        "role": "NORMAL",
        "hp": 1,
        "color": "#41b06e"
      },
      "B": {
        "symbol": "B",
        "role": "NORMAL",
        "hp": 1,
        "color": "#2f6fed"
      },
      "Y": {
        "symbol": "Y",
        "role": "NORMAL",
        "hp": 1,
        "color": "#f4b740"
      },
      "P": {
        "symbol": "P",
        "role": "NORMAL",
        "hp": 1,
        "color": "#b06ab3"
      },
      "C": {
        "symbol": "C",
        "role": "NORMAL",
        "hp": 1,
        "color": "#4ecdc4"
      },
      "O": {
        "symbol": "O",
        "role": "NORMAL",
        "hp": 1,
        "color": "#ff7b54"
      },
      "D": {
        "symbol": "D",
        "role": "NORMAL",
        "hp": 2,
        "color": "#f4b740"
      },
      "E": {
        "symbol": "E",
        "role": "NORMAL",
        "hp": 3,
        "color": "#b06ab3"
      },
      "F": {
        "symbol": "F",
        "role": "NORMAL",
        "hp": 4,
        "color": "#ff7b54"
      },
      "M": {
        "symbol": "M",
        "role": "BOMB",
        "hp": 1,
        "color": "#111111"
      },
      "L": {
        "symbol": "L",
        "role": "PRISM",
        "hp": 1,
        "color": "#7dd3fc"
      },
      "K": {
        "symbol": "K",
        "role": "CORE",
        "hp": 5,
        "color": "#f59e0b"
      },
      "A": {
        "symbol": "A",
        "role": "NORMAL",
        "hp": 2,
        "color": "#2f6fed"
      },
      "H": {
        "symbol": "H",
        "role": "NORMAL",
        "hp": 2,
        "color": "#b06ab3"
      },
      "I": {
        "symbol": "I",
        "role": "NORMAL",
        "hp": 2,
        "color": "#ef1d1d"
      },
      "J": {
        "symbol": "J",
        "role": "NORMAL",
        "hp": 2,
        "color": "#41b06e"
      },
      "N": {
        "symbol": "N",
        "role": "NORMAL",
        "hp": 2,
        "color": "#4ecdc4"
      },
      "Q": {
        "symbol": "Q",
        "role": "NORMAL",
        "hp": 2,
        "color": "#ff7b54"
      }
    },
    "rleGrid": "42.|42.|.AYHBIJCIA2IGOSJBYRN2OJIQDIQHINAQBOYQDPHJ.|.BI2CBCORINAPGSIQPNAI.PYAODGCOCBQBQYQNBRO.|.GIRHNOPNYBONPSGOPD5.DHPY2PJBAYAYAPIQB.|.ROGRDCYNPIBAOSJCNI5.BIBNIRJP2YPCDRAGI.|.2AJYANPJIQAQPSPIG7.AG2CQDAYOPIYONQG.|.YBIJ2RI2HRBYJSPN2D5.YIN2RNCRPIHPHJRDY.|.J2ONOHIARAODASRYCP5.DN2CQRJQHAPNDBNJN.|.PRBNBHCGHBNRJS3.GIO.DYQICRQCOJQGAGQCPAI.|.NCOPGRIHRNQANS3.YHBYQ2HCIJONCYDQPODQ2OB.|.QONOCRYJORYBRS3.DHDCH2QCOYINIYQHQIGCAPA.|.GPQD2NAPDY2NHSA3.RIRGBHJYAY2JRBYAJBRIAI.|.IOGOQNRNRNJHRCD3.HNHQPRPAOASNGCABOPOIDA.|.CYCY2RDQJCGOGYN3.2RJDAQGIPGS3JPHQPCAGH.|.AHQ2Y2PH2PIRN2RN3.NJYOARBNCSAI2AQ2HODCD.|.CDGORCNOYDGPYOAC3.RJGPDGJOCSD2NOCJBYDAB.|.HBHRH2CRNACDJ2H3.IQGI2GAPRJSRBAPC2DHAID.|.YARCHJRGDAPQRQY3.CBDIPNP2HISADNIRAQBCGH.|.CIDYOHJCYPCPGHN3.BAGBYOPNGQNHJRIHYPHQRQ.|.J2RYBYD2HIC3B3.YIYQ2NQ2YBODQP2ABIBNHRN.|.DQOQDGJHCGNHJGO3.O2PG2ONY2ODH2ODQOJQDIA.|.QBRJ2ROBQRJGYDG3.CRINDYCRCO2BDRJIAC2PJO.|.ISDNQ2DGNBPIN2C3.AQOBDJACYNHQAODQDGJBNP.|.QSNAORIONOQARPRH3.JPBDBGYIRPOHBQHAQNAHA.|.YSQAROJAIQJQJOHY3.PBGQDRNYOB2RQHQDCORNC.|.NSOQNJBJ2BGNIBPI3.ORADRABJ2IPBARIGYOICY.|.BSYOYSNJRGOPOQRYD3.AH2AYPDHAPAHYAONJYOG.|.ISJHJSPHP3Y2N2GOP3.R2IYCB2RAJOHJNOIROR.|.QSI2RSDHORNJDNYABN3.DNCNHQ2IBYDRBIJBJQJ.|.PNOJGS2DB3ROI2GJBQ3.D2RANQROHGJ2QNJRQO.|.RCJBCSGDNOPQCGDHACQ3.CRPCNBCJYOCBIBAB2R.|.QOQOYSCORDNIBRIJQPC3.BPJNRJCOIJQIRBA2YP.|.2QHYCSNQI2AIBQAGRJP3.IAGJ2IPQ2IJRGA2COJ.|.YNQOYSNDYANBODC2NY3.JCNYB3JPCNPGYBCPCY.|.OHDQPSR2J2BICHGNCIC3.OPCRBDJCYHYCQIOQGN.|42.|42.",
    "mechanics": {
      "initialSkills": {
        "multiLaunch": 3,
        "tripleSplit": 2
      }
    },
    "difficultyScore": {
      "totalScore": 62,
      "tier": "HARD",
      "breakableCount": 1217,
      "steelOcclusionRatio": 0.7272727272727273,
      "simBreakRate20s": 0.13537387017255545,
      "hasDeadZoneWarning": false
    }
  },
  {
    "version": 1,
    "id": "builtin-12",
    "name": "精选关卡 12",
    "cols": 42,
    "rows": 38,
    "palette": {
      ".": {
        "symbol": ".",
        "role": "EMPTY",
        "hp": 0,
        "color": "#000000"
      },
      "S": {
        "symbol": "S",
        "role": "STEEL",
        "hp": 9999,
        "color": "#9aa4b2"
      },
      "R": {
        "symbol": "R",
        "role": "NORMAL",
        "hp": 1,
        "color": "#ef1d1d"
      },
      "G": {
        "symbol": "G",
        "role": "NORMAL",
        "hp": 1,
        "color": "#41b06e"
      },
      "B": {
        "symbol": "B",
        "role": "NORMAL",
        "hp": 1,
        "color": "#2f6fed"
      },
      "Y": {
        "symbol": "Y",
        "role": "NORMAL",
        "hp": 1,
        "color": "#f4b740"
      },
      "P": {
        "symbol": "P",
        "role": "NORMAL",
        "hp": 1,
        "color": "#b06ab3"
      },
      "C": {
        "symbol": "C",
        "role": "NORMAL",
        "hp": 1,
        "color": "#4ecdc4"
      },
      "O": {
        "symbol": "O",
        "role": "NORMAL",
        "hp": 1,
        "color": "#ff7b54"
      },
      "D": {
        "symbol": "D",
        "role": "NORMAL",
        "hp": 2,
        "color": "#f4b740"
      },
      "E": {
        "symbol": "E",
        "role": "NORMAL",
        "hp": 3,
        "color": "#b06ab3"
      },
      "F": {
        "symbol": "F",
        "role": "NORMAL",
        "hp": 4,
        "color": "#ff7b54"
      },
      "M": {
        "symbol": "M",
        "role": "BOMB",
        "hp": 1,
        "color": "#111111"
      },
      "L": {
        "symbol": "L",
        "role": "PRISM",
        "hp": 1,
        "color": "#7dd3fc"
      },
      "K": {
        "symbol": "K",
        "role": "CORE",
        "hp": 5,
        "color": "#f59e0b"
      },
      "A": {
        "symbol": "A",
        "role": "NORMAL",
        "hp": 2,
        "color": "#ef1d1d"
      },
      "H": {
        "symbol": "H",
        "role": "NORMAL",
        "hp": 2,
        "color": "#ff7b54"
      },
      "I": {
        "symbol": "I",
        "role": "NORMAL",
        "hp": 2,
        "color": "#41b06e"
      },
      "J": {
        "symbol": "J",
        "role": "NORMAL",
        "hp": 2,
        "color": "#4ecdc4"
      },
      "N": {
        "symbol": "N",
        "role": "NORMAL",
        "hp": 2,
        "color": "#2f6fed"
      },
      "Q": {
        "symbol": "Q",
        "role": "NORMAL",
        "hp": 2,
        "color": "#b06ab3"
      }
    },
    "rleGrid": "42.|42.|.AHIJOYBGRCGBJGDIDHCBGCARHONP3HRSDQPAIRB.|.DAJGOGD2RPADCOHGOCAO.RB2NHQBGOIRSGCO2NYJ.|.GQBONPODAC2PYAGANI5.AODGIPARPSQAHCDRP.|.RDHCBIJGAHOQPGOAQG5.CIHQPJNJGS2DCJRJB.|.AROBIJDBDHIQHOYRD7.GANIGBQBSIRBHPNR.|.QARH2DGACNJIGDSPJO5.NABNDPHORSYPJBGAB.|.GIPHNPANCNHJDGSGQA5.PHAQNCPNOSANRBANY.|.BPHCIARCNYPCQYSQOHOY.PR3.PDO2AYSBQY2HJO.|.DCHC2BGHADAJHQSOQCYGRBP3.BNPYGAGNORICJP.|.OIBPGDPNHAIBDOSHPORANBCD3.2CQIBQCAHN3C.|.P2BAYP2OJ2BQPNSHQJHQGCG3.OPCIDIBQAJPGRP.|.BHOYNDR2YHRAOJSCGIJORQ3.2RADI2NOYCJNJAC.|.JDHYBDBOYAHOBJS2PYGAGA3.3NYDGDJPORCONP.|.C2JAHBCPJNCJGRS2GIHCY3.RDQHQHRO2QB2NPHJ.|.QO2CGQCNYGAPARSGNJ2BGB3.Y2DIHPRDCBHCIYP.|.O2PO2DPC2RAJBASQJRJNC3.GDYB2N2DR2JARDON.|.DYDCAJRDBSBPBHDNJDCN3.YAJBPDYDJC2INOIYB.|.YRG2HRCBOSBQNRP2ABP3.QP2JQACHRHJIQ2CAQA.|.IQDCBPOYCSBRBNOJHJO3.YDQIQABHRDBHC2YGCG.|.2PGCQAHQBSACIAHDHJYQ3.AJRY2OPQCHYRCGBND.|.DPR2GJYHDS2HAIJQH2B3.BQ2AH2YRIJO2RADCRJ.|.YAI2BQ2BISQRAJHACIRB3.HDIBPCAJANY2NGYRQ.|.NQACI2APDSCYIGPACDQ3.RHIDPDBRYPICJNOINO.|.HBJGONDPGSQ2GANYRP3.BGNYGIQPIHNHYCJPDPA.|.SQHJHGIAGSIBHDAYIP3.OPAPJYGD3CARBPHBAP.|.SIDQYBOGDSPAJYC2DBA3.RJHARJDCGCPAOARBGJ.|.SYN2HYCQRSIQHJYDBRG3.IONYQRJACQPOBGOAPI.|.SHQGY2RCQS2HNAPGYHY3.CIAOIBAQYDBJYJNYOA.|.SJCOQ2IOQNPD2RBHDO3.JBQNQBAIOBIHBDIHYSG.|.S2BCYDHBIDO2JIG2NR3.NHACODQBCYR3ICDJSN.|.SPQJIRBRPQOBYBNCARN3.RBCGJH3QCO2NPAPSH.|.S2BJY2ABPIOYQYNRIJHD3.N2RQAJCGIHRPNCYSD.|.SQCQIQR2HOQJ2YPCJBG3.DOIBAJDGR2OANDQBSB.|.CBIGC3IRANDNAP2NJH3.PJBNDGBRYD2CB2NYSO.|42.|42.",
    "mechanics": {
      "initialSkills": {
        "multiLaunch": 3,
        "tripleSplit": 2
      }
    },
    "difficultyScore": {
      "totalScore": 64,
      "tier": "HARD",
      "breakableCount": 1204,
      "steelOcclusionRatio": 0.8695652173913043,
      "simBreakRate20s": 0.1356935215946844,
      "hasDeadZoneWarning": false
    }
  },
  {
    "version": 1,
    "id": "builtin-13",
    "name": "精选关卡 13",
    "cols": 42,
    "rows": 38,
    "palette": {
      ".": {
        "symbol": ".",
        "role": "EMPTY",
        "hp": 0,
        "color": "#000000"
      },
      "S": {
        "symbol": "S",
        "role": "STEEL",
        "hp": 9999,
        "color": "#9aa4b2"
      },
      "R": {
        "symbol": "R",
        "role": "NORMAL",
        "hp": 1,
        "color": "#ef1d1d"
      },
      "G": {
        "symbol": "G",
        "role": "NORMAL",
        "hp": 1,
        "color": "#41b06e"
      },
      "B": {
        "symbol": "B",
        "role": "NORMAL",
        "hp": 1,
        "color": "#2f6fed"
      },
      "Y": {
        "symbol": "Y",
        "role": "NORMAL",
        "hp": 1,
        "color": "#f4b740"
      },
      "P": {
        "symbol": "P",
        "role": "NORMAL",
        "hp": 1,
        "color": "#b06ab3"
      },
      "C": {
        "symbol": "C",
        "role": "NORMAL",
        "hp": 1,
        "color": "#4ecdc4"
      },
      "O": {
        "symbol": "O",
        "role": "NORMAL",
        "hp": 1,
        "color": "#ff7b54"
      },
      "D": {
        "symbol": "D",
        "role": "NORMAL",
        "hp": 2,
        "color": "#f4b740"
      },
      "E": {
        "symbol": "E",
        "role": "NORMAL",
        "hp": 3,
        "color": "#b06ab3"
      },
      "F": {
        "symbol": "F",
        "role": "NORMAL",
        "hp": 4,
        "color": "#ff7b54"
      },
      "M": {
        "symbol": "M",
        "role": "BOMB",
        "hp": 1,
        "color": "#111111"
      },
      "L": {
        "symbol": "L",
        "role": "PRISM",
        "hp": 1,
        "color": "#7dd3fc"
      },
      "K": {
        "symbol": "K",
        "role": "CORE",
        "hp": 5,
        "color": "#f59e0b"
      },
      "A": {
        "symbol": "A",
        "role": "NORMAL",
        "hp": 2,
        "color": "#ef1d1d"
      },
      "H": {
        "symbol": "H",
        "role": "NORMAL",
        "hp": 2,
        "color": "#ff7b54"
      },
      "I": {
        "symbol": "I",
        "role": "NORMAL",
        "hp": 2,
        "color": "#41b06e"
      },
      "J": {
        "symbol": "J",
        "role": "NORMAL",
        "hp": 2,
        "color": "#4ecdc4"
      },
      "N": {
        "symbol": "N",
        "role": "NORMAL",
        "hp": 2,
        "color": "#2f6fed"
      },
      "Q": {
        "symbol": "Q",
        "role": "NORMAL",
        "hp": 2,
        "color": "#b06ab3"
      }
    },
    "rleGrid": "42.|42.|.AHIJOYBGRCGBJGDIDHCBGCARHONP3HRNDQPAIRB.|.DAJGOGD2RPADCOHGOCAO.RB2NHQBGOIRCGCO2NYJ.|.GQBONPODAS2PYAGANI5.AODGIPARPJQAHCDRP.|.RDHCBIJGASOQPGOAQG5.CIHQPJNJGN2DCJRJB.|.AROBIJDBDSIQHOYRD7.GANIGBQBCIRBHPNR.|.QARH2DGACSJIG2DPJO5.NABNDPHORPYPJBGAB.|.GIPHNPANCSHJDGJGQA5.PHAQNCPNO2ANRBANY.|.BPHCIARCNSPCQYBQOHOY.PR3.PDO2AYQBQY2HJO.|.DCHC2BGHASAJHQPOQCYGRBP3.BNPYGAGNORICJP.|.OIBPGDPNHSIBDOBHPORANBCD3.2CQIBQCAHN3C.|.P2BAYP2OJSBQPNDHQJHQGCG3.OPCIDIBQAJPGRP.|.BHOYNDR2YSRAOJSCGIJORQ3.2RADI2NSYCJNJAC.|.JDHYBDBOYSHOBJS2PYGAGA3.3NYDGDSPORCONP.|.C2JAHBCPJSCJGRS2GIHCY3.RDQHQHROSQB2NPHJ.|.QO2CGQCNYSAPARSGNJ2BGB3.Y2DIHPRSCBHCIYP.|.O2PO2DPC2RAJBASQJRJNC3.GDYB2N2DS2JARDON.|.DYDCAJRD3BPBHSNJDCN3.YAJBPDYDJS2INOIYB.|.YRG2HRCBOYBQNRS2ABP3.QP2JQACHRHSIQ2CAQA.|.IQDCBPOYCYBRBNSJHJO3.YDQIQABHRDSHC2YGCG.|.2PGCQAHQB2ACIAHDHJYQ3.AJRY2OPQCSYRCGBND.|.DPR2GJYHDA2HAIJQH2B3.BQ2AH2YRIJS2RADCRJ.|.YAI2BQ2BIAQRAJHACIRB3.HDIBPCAJASY2NGYRQ.|.SQACI2APDHCYIGPACDQ3.RHIDPDBRYPSCJNOINO.|.SBJGONDPGHQ2GANYRP3.BGNYGIQPIHNSYCJPDPA.|.SQHJHGIAG2IBHDAYIP3.OPAPJYGD3CARBPHBAP.|.SIDQYBOGDIPAJYC2DBA3.RJHARJDCGCPAOARBGJ.|.SYN2HYCQRDIQHJYDBRG3.IONYQRJACQPOBGOAPI.|.SHQGY2RCQA2HNAPGYHY3.CIAOIBAQYDBJYJNYOA.|.SJCOQ2IOQNPD2RBHDO3.JBQNQBAIOBIHBDIHYOG.|.R2BCYDHBIDO2JIG2NR3.NHACODQBCYR3ICD2JN.|.CPQJIRBRPQOBYBNCARN3.RBCGJH3QCO2NPA2PH.|.D2BJY2ABPIOYQYNRIJHD3.N2RQAJCGIHRPNCYAD.|.DQCQIQR2HOQJ2YPCJBG3.DOIBAJDGR2OANDQBAB.|.CBIGC3IRANDNAP2NJH3.PJBNDGBRYD2CB2NYGO.|42.|42.",
    "mechanics": {
      "initialSkills": {
        "multiLaunch": 3,
        "tripleSplit": 2
      }
    },
    "difficultyScore": {
      "totalScore": 67,
      "tier": "HARD",
      "breakableCount": 1209,
      "steelOcclusionRatio": 1,
      "simBreakRate20s": 0.12779156327543423,
      "hasDeadZoneWarning": false
    }
  },
  {
    "version": 1,
    "id": "builtin-14",
    "name": "精选关卡 14",
    "cols": 42,
    "rows": 38,
    "palette": {
      ".": {
        "symbol": ".",
        "role": "EMPTY",
        "hp": 0,
        "color": "#000000"
      },
      "S": {
        "symbol": "S",
        "role": "STEEL",
        "hp": 9999,
        "color": "#9aa4b2"
      },
      "R": {
        "symbol": "R",
        "role": "NORMAL",
        "hp": 1,
        "color": "#ef1d1d"
      },
      "G": {
        "symbol": "G",
        "role": "NORMAL",
        "hp": 1,
        "color": "#41b06e"
      },
      "B": {
        "symbol": "B",
        "role": "NORMAL",
        "hp": 1,
        "color": "#2f6fed"
      },
      "Y": {
        "symbol": "Y",
        "role": "NORMAL",
        "hp": 1,
        "color": "#f4b740"
      },
      "P": {
        "symbol": "P",
        "role": "NORMAL",
        "hp": 1,
        "color": "#b06ab3"
      },
      "C": {
        "symbol": "C",
        "role": "NORMAL",
        "hp": 1,
        "color": "#4ecdc4"
      },
      "O": {
        "symbol": "O",
        "role": "NORMAL",
        "hp": 1,
        "color": "#ff7b54"
      },
      "D": {
        "symbol": "D",
        "role": "NORMAL",
        "hp": 2,
        "color": "#f4b740"
      },
      "E": {
        "symbol": "E",
        "role": "NORMAL",
        "hp": 3,
        "color": "#b06ab3"
      },
      "F": {
        "symbol": "F",
        "role": "NORMAL",
        "hp": 4,
        "color": "#ff7b54"
      },
      "M": {
        "symbol": "M",
        "role": "BOMB",
        "hp": 1,
        "color": "#111111"
      },
      "L": {
        "symbol": "L",
        "role": "PRISM",
        "hp": 1,
        "color": "#7dd3fc"
      },
      "K": {
        "symbol": "K",
        "role": "CORE",
        "hp": 5,
        "color": "#f59e0b"
      },
      "A": {
        "symbol": "A",
        "role": "NORMAL",
        "hp": 2,
        "color": "#ef1d1d"
      },
      "H": {
        "symbol": "H",
        "role": "NORMAL",
        "hp": 2,
        "color": "#41b06e"
      },
      "I": {
        "symbol": "I",
        "role": "NORMAL",
        "hp": 2,
        "color": "#2f6fed"
      },
      "J": {
        "symbol": "J",
        "role": "NORMAL",
        "hp": 2,
        "color": "#ff7b54"
      },
      "N": {
        "symbol": "N",
        "role": "NORMAL",
        "hp": 2,
        "color": "#b06ab3"
      },
      "Q": {
        "symbol": "Q",
        "role": "NORMAL",
        "hp": 2,
        "color": "#4ecdc4"
      }
    },
    "rleGrid": "42.|42.|.AHAOHIRCDGJO3JYBCP2JNCHBA4BOA2YIOGNJP.|.CGAPCJH2YRBC2AIQIAOP.GNHJNIBQAORDAIY2GYJ.|.OQYPRAYHJYGOYH2AOJ5.QHOHGDOIHJPNDRIDO.|.NAGICHR2HPN2JIRIHY5.NAOYIPQYRPHJOJNAR.|.DJAGNY2CGYIQBIROQ7.DOAIY2RG2BGAPDQO.|.2OBJNDJNJGRPJ2QBIH5.RABCJYGADCOCYDBCB.|.IDSAIJ2PDGCOCIACAN5.CQHNQGNCIYNGHJORJ.|.2GSRYPYJDNDJR2ADJY3.INBJNGQHNJYNDOYNJHN.|.RPSBDQPADYHRI2CDB2Q3.PBPQ2PJA2IQR2QNCPN.|.BRSAGCRCRPDQDYPBAG3.ICYGBQIONPDQYDSHOJP.|.OGS2ICGJAJOB2O2C2B3.PYIRAGBPANPO2ISDQPD.|.PYSBHPCPGYQYCJOG2PO3.IARONRBYRQOJDSCHRB.|.ARSG2YABRIOARG2BCO3.GQHCYOSJBNHGONSYR2P.|.CDSIRBONIJDGNRYGDGO3.NCOJISOAQROHNSJANO.|.DGYARHPQPIDNPQCADI3.BGDJ2YSIHICHCPSBGBI.|.OGOGQAYPGADNDAOIC3.A2IOPNQSPHDYABPSJ2AP.|.GBJCGBRGCDBJCI2YB3.YIPNPIJSYGIH2C2RDA2G.|.HIYORQ2PGYOBDRHGPD3.OC2BYHSAI2HGQGIRHOH.|.OYNPHRGCIYHYORHQJ3.DAQCOJNSIYHOYJBIQRQP.|.AGRYCQRIHCDIGOGYBC3.2JOCROSODACDQHQHAHR.|.NAGDPHDHNAQNHDGQDYG3.YIPDGSNJAJDRGBAJHB.|.QAR2ICASAQI2CBPDIQO3.BIRIJSB3G2IABAIOR.|.HBC2GACSY2DRCPNQIYR3.2Y2APSNRDIBQRHIOYC.|.NAQNABGSQDHYNRDAPBOI3.APYOSQ2BAPDJCPIBS.|.R2DYJBASHBCBPIHYORAI3.IAQPSYJGHYIGJOPJS.|.ICHIDHCSNARIY2QJQBHO3.JQPY2PQDBANACBNOS.|.2GOCBJRSAD2JNQYDCYI3.BGCAPDIAGIRQ2YONRS.|.QOPHBOQSYIBJAHPDHQB3.JCYNC2BR2BRYPBCRIS.|.RNJCORCSONYGAJCOYDJ3.DC2BDBYQHYDCYDBRGS.|.GHGHQNIS2OIAODPRQPGY3.OCYG2JCPQABDJ2HND.|.2NOYBGRSJHJN2PIOGA2Y3.QYIGJRJYNQNBIDPRH.|.GBRDIDCSBNP2QINCIYD3.INDPOPYAHNCH2ARGJC.|.2NCN2PQSBNOCGDYCOGQ3.COQYRHNJYHIHDCBPRB.|.AJIOCJNH2AB2OYIJCGI3.OJNGDRDBPOPBCJIRJR.|42.|42.",
    "mechanics": {
      "initialSkills": {
        "multiLaunch": 3,
        "tripleSplit": 2
      }
    },
    "difficultyScore": {
      "totalScore": 72,
      "tier": "HARD",
      "breakableCount": 1205,
      "steelOcclusionRatio": 1,
      "simBreakRate20s": 0.10985477178423238,
      "hasDeadZoneWarning": false
    }
  },
  {
    "version": 1,
    "id": "builtin-15",
    "name": "精选关卡 15",
    "cols": 42,
    "rows": 38,
    "palette": {
      ".": {
        "symbol": ".",
        "role": "EMPTY",
        "hp": 0,
        "color": "#000000"
      },
      "S": {
        "symbol": "S",
        "role": "STEEL",
        "hp": 9999,
        "color": "#9aa4b2"
      },
      "R": {
        "symbol": "R",
        "role": "NORMAL",
        "hp": 1,
        "color": "#ef1d1d"
      },
      "G": {
        "symbol": "G",
        "role": "NORMAL",
        "hp": 1,
        "color": "#41b06e"
      },
      "B": {
        "symbol": "B",
        "role": "NORMAL",
        "hp": 1,
        "color": "#2f6fed"
      },
      "Y": {
        "symbol": "Y",
        "role": "NORMAL",
        "hp": 1,
        "color": "#f4b740"
      },
      "P": {
        "symbol": "P",
        "role": "NORMAL",
        "hp": 1,
        "color": "#b06ab3"
      },
      "C": {
        "symbol": "C",
        "role": "NORMAL",
        "hp": 1,
        "color": "#4ecdc4"
      },
      "O": {
        "symbol": "O",
        "role": "NORMAL",
        "hp": 1,
        "color": "#ff7b54"
      },
      "D": {
        "symbol": "D",
        "role": "NORMAL",
        "hp": 2,
        "color": "#f4b740"
      },
      "E": {
        "symbol": "E",
        "role": "NORMAL",
        "hp": 3,
        "color": "#b06ab3"
      },
      "F": {
        "symbol": "F",
        "role": "NORMAL",
        "hp": 4,
        "color": "#ff7b54"
      },
      "M": {
        "symbol": "M",
        "role": "BOMB",
        "hp": 1,
        "color": "#111111"
      },
      "L": {
        "symbol": "L",
        "role": "PRISM",
        "hp": 1,
        "color": "#7dd3fc"
      },
      "K": {
        "symbol": "K",
        "role": "CORE",
        "hp": 5,
        "color": "#f59e0b"
      },
      "A": {
        "symbol": "A",
        "role": "NORMAL",
        "hp": 2,
        "color": "#ef1d1d"
      },
      "H": {
        "symbol": "H",
        "role": "NORMAL",
        "hp": 2,
        "color": "#ff7b54"
      },
      "I": {
        "symbol": "I",
        "role": "NORMAL",
        "hp": 2,
        "color": "#4ecdc4"
      },
      "J": {
        "symbol": "J",
        "role": "NORMAL",
        "hp": 2,
        "color": "#2f6fed"
      },
      "N": {
        "symbol": "N",
        "role": "NORMAL",
        "hp": 2,
        "color": "#b06ab3"
      },
      "Q": {
        "symbol": "Q",
        "role": "NORMAL",
        "hp": 2,
        "color": "#41b06e"
      }
    },
    "rleGrid": "42.|42.|.ARDGYRDH2PIAJICBAYNINBI2YIJNONHAY2JYJQNI.|.BPNHNHJH2PQ2AOPBDRPI.GPNJAQ2YPYJBAGOIRGS.|.GYBHJGCGOYPAJRPD2H5.HCJODJDCPCPHJRPHS.|.OYIAQ2IRPDANIHIYAN5.PQ3B2CON2IOBGIYS.|.GCHAQYDQJCG2JAGPG7.2QRBA2QCBIJIG2NS.|.BOAYN2CRQHDORG4P5.DICQHDQGPIADRHYOS.|.YHYQC2J2AQGRPBCOCI5.NABNPBRQCB2YAHCQS.|.HOGHNJNANSBORDH2QDHA.A3.YI2PDQSRAJY2OGS.|.QOBYOQNCDSYPNGOIAIYNJ3.AIJRCOGSGIBNHGPS.|.CAJBAINJCSPJIYHN2Q2NI3.IYJCOQJSO2BAYOAS.|.DNQN2RQGRSQNRGJGBG2IB3.Q3JHGBSGBAODBPS.|.GCID2IQYBSHIG2OP2BCI3.DQYNGDHPSYGJIADHS.|.HOJIDROPQSDOAONCIDI3.QB2CBGI2RSGD2PCNYG.|.JBDBIOGDQIOGRPGINY3.HIRYRQBJYQSIQDNCGPD.|.HN2QDPAIJYBDCGRQB3.ARN2GDPJOJDSORGOQA2P.|.AIHGBQGPQOQHGIQPBD3.NIQPAIOBNCJDAQOGOGN.|.JQJRPJHBQGHYDIAY2PG3.IBDGDHICRHGDHYCHPA.|.PQBRAIBCGJCI2QGN2YN3.PDRQJDGAIRADOAPOPY.|.JBCNIBGNOG2HGYJND2J3.AOJGHROYJHRPYQJ2BD.|.HOQ2YPG2NPIRJHJHQI3.OGRADHIHDGQOPGRHAIQ.|.AOYROJNYGDHAQNDBJG3.GBJYPANHDOB2HDJBHBG.|.JIGHDRPCAQJDOGCA2D3.DHYHYPGQRJDYGBD3QG.|.IJ2RNIDIRJPRASOGN3.OP2BOHDPAHADNAHIHCYH.|.IRINCRQDRCNAHS2NGR3.YBOYAH2QYC2GOIYAOJH.|.NASOHBHBYNYOHSI2AIY3.PGDY2CAOGQNIJNH2AJ.|.RJS2R3HCJQ2BSGCJDRC3.OINDJBHBIAONPYHAD.|.ICSRNJC2QNJINSIPBJDB3.GR2PIHAROAIJGBH2D.|.CQSROBPNIGYBASOJYHG3.JGJ2NBHRYARIGOJADH.|.HYSARBAGQPY2NS2CIYA3.QRPOBCDYQA2O2NRGRN.|.OHSOADNR2HBGYD2YDA3.IYBONGQY2BGDBOJGB2N.|.C2HR2CHBGBPNAQ2INCQ3.HDPAHDGI2PQOBNDBJC.|.YHQYNGBRICGRBJYJBC3.QNDPJ2DQDODAHBIJ2BC.|.CHADRPGIDCYGQNJYOQA3.PYNHNHYGHJAHYBNHRP.|.NYGAJNQJQGHB2PQ2JHY3.D2QYPIRHP2AQRJNARD.|42.|42.",
    "mechanics": {
      "initialSkills": {
        "multiLaunch": 3,
        "tripleSplit": 2
      }
    },
    "difficultyScore": {
      "totalScore": 73,
      "tier": "HARD",
      "breakableCount": 1212,
      "steelOcclusionRatio": 1,
      "simBreakRate20s": 0.10282590759075907,
      "hasDeadZoneWarning": false
    }
  },
  {
    "version": 1,
    "id": "builtin-16",
    "name": "精选关卡 16",
    "cols": 42,
    "rows": 38,
    "palette": {
      ".": {
        "symbol": ".",
        "role": "EMPTY",
        "hp": 0,
        "color": "#000000"
      },
      "S": {
        "symbol": "S",
        "role": "STEEL",
        "hp": 9999,
        "color": "#9aa4b2"
      },
      "R": {
        "symbol": "R",
        "role": "NORMAL",
        "hp": 1,
        "color": "#ef1d1d"
      },
      "G": {
        "symbol": "G",
        "role": "NORMAL",
        "hp": 1,
        "color": "#41b06e"
      },
      "B": {
        "symbol": "B",
        "role": "NORMAL",
        "hp": 1,
        "color": "#2f6fed"
      },
      "Y": {
        "symbol": "Y",
        "role": "NORMAL",
        "hp": 1,
        "color": "#f4b740"
      },
      "P": {
        "symbol": "P",
        "role": "NORMAL",
        "hp": 1,
        "color": "#b06ab3"
      },
      "C": {
        "symbol": "C",
        "role": "NORMAL",
        "hp": 1,
        "color": "#4ecdc4"
      },
      "O": {
        "symbol": "O",
        "role": "NORMAL",
        "hp": 1,
        "color": "#ff7b54"
      },
      "D": {
        "symbol": "D",
        "role": "NORMAL",
        "hp": 2,
        "color": "#f4b740"
      },
      "E": {
        "symbol": "E",
        "role": "NORMAL",
        "hp": 3,
        "color": "#b06ab3"
      },
      "F": {
        "symbol": "F",
        "role": "NORMAL",
        "hp": 4,
        "color": "#ff7b54"
      },
      "M": {
        "symbol": "M",
        "role": "BOMB",
        "hp": 1,
        "color": "#111111"
      },
      "L": {
        "symbol": "L",
        "role": "PRISM",
        "hp": 1,
        "color": "#7dd3fc"
      },
      "K": {
        "symbol": "K",
        "role": "CORE",
        "hp": 5,
        "color": "#f59e0b"
      },
      "A": {
        "symbol": "A",
        "role": "NORMAL",
        "hp": 2,
        "color": "#4ecdc4"
      },
      "H": {
        "symbol": "H",
        "role": "NORMAL",
        "hp": 2,
        "color": "#41b06e"
      },
      "I": {
        "symbol": "I",
        "role": "NORMAL",
        "hp": 2,
        "color": "#ef1d1d"
      },
      "J": {
        "symbol": "J",
        "role": "NORMAL",
        "hp": 2,
        "color": "#2f6fed"
      },
      "N": {
        "symbol": "N",
        "role": "NORMAL",
        "hp": 2,
        "color": "#ff7b54"
      },
      "Q": {
        "symbol": "Q",
        "role": "NORMAL",
        "hp": 2,
        "color": "#b06ab3"
      }
    },
    "rleGrid": "42.|42.|.A2PDHAIBJARHRORJOBONAIQCIJOGHICPRDOCHA2Q.|.IYGIBQROPINI2BJ2IAPB.HODIQGB2NH2GDCJAHCB.|.IDGAQJHBRDBJYQGIPR5.AHODPBYDGHAIOCYBN.|.BGDNQRDQRNGONRJQPN5.G2BCGPCRNCAJDRBJI.|.IDG2P2BAPHPYRNYHP7.HICQDYIPHNCAG2YH.|.HAGRNOBY2R2BNONYNO5.JCDQ2YNSDPYDBJDCY.|.NRYHCDAD2QNOIJOIRA5.QYBJBCYSCBJDCYGJY.|.2OCSRPHSORJHOYNHCPQB.RBPQ3.NASQO2DRYCPC.|.HDGSRNHSNPARDCGYJYCRCNOH3.GCBSPHN2P2QBO.|.ODOSJRHSHDQDJPC2ABCIYRYGP3.IHSRGBOYG3N.|.CDYSPRNSYBOA2OBJA2RCPHDCGR3.ASJDIJDHYRO.|.HCOSRQCSGHBGDYHRHGHNIBGIR3.JCSRHYHNDCQJ.|.RYASI2CSOIYPDCJ2QOHBJIDND3.RNSQI2NPJIPY.|.JIOSYAJSQNACYJCQC2HDYOQDQ3.NGSNYHCBORNC.|.2QNSPIBSPRPCGDCODQBPIDNO3.CDPSRBPINHRYJ.|.CRNS2PISOYQHNQAQDJ2H3O3.DIOBSPBARHGOAY.|.JOISPGRSBYIYJAO2QYQ2JQ3.O2PDBSBAYAG2QND.|.YGPSYOJSOBJQRIOQHRYDOY3.NGRICSJA2DBAHJG.|.HPHBHOASYJHIYAORQJCPR3.YJRNRDSRICQPGNDH.|.GRHAIORSBQPY2QNQAC2RNI3.OPBNGQRPJQHIDGI.|.2A2YBDCNGCNRDIJA2GNCJAD3.JQPBR2OIPQIQYJ.|.HDIQJHQRARCI2G2RB2NRDP3.GHDR2APARBY2PRB.|.JBDY2IHAHNICIHYAN2GJO3.AJCINYBQHCNONHAG.|.JHDIJGAQJGJRQN2GBQIB3.JRJPCYIABYI2DAIHJ.|.HNROJHJODHAIR2QYJOJ3.JCJNCJN2ONOGQNAHJR.|.BNJNGP2JYDINA2IPAGI3.BQPHADIHCADRCIBPCJ.|.2NCOHOGCACANHR2QHJ3.RYNOCPAJIBGPIYDJCYC.|.OG2BJNYQGDHOYGIYQG3.YHARIPHI2GAIHJHQOJI.|.OC2HCOBY2GCDNDACHR3.GBJRCHIPDR2PYADCAOG.|.CDNIOHJYPNJYHG2QI3.ICJAJNQDCNHPCQRNHBIQ.|.DNIDCPRGCGODCBDRAN3.DQRBNJDQROPBOA2PAPC.|.YN2QNRNHDADCJDPICH3.QHIBJIHAB2YRARQNPYR.|.QGCDJPBHRY2PNINYDRD3.RDBDQJOIHBJYGIJPBQ.|.RANYRIBDQPCGBYDYHBJ3.POYHAHNI2OHBG2ORIC.|42.|42.",
    "mechanics": {
      "initialSkills": {
        "multiLaunch": 3,
        "tripleSplit": 2
      }
    },
    "difficultyScore": {
      "totalScore": 79,
      "tier": "HARD",
      "breakableCount": 1212,
      "steelOcclusionRatio": 1,
      "simBreakRate20s": 0.07508250825082508,
      "hasDeadZoneWarning": false
    }
  },
  {
    "version": 1,
    "id": "builtin-17",
    "name": "精选关卡 17",
    "cols": 42,
    "rows": 38,
    "palette": {
      ".": {
        "symbol": ".",
        "role": "EMPTY",
        "hp": 0,
        "color": "#000000"
      },
      "S": {
        "symbol": "S",
        "role": "STEEL",
        "hp": 9999,
        "color": "#9aa4b2"
      },
      "R": {
        "symbol": "R",
        "role": "NORMAL",
        "hp": 1,
        "color": "#ef1d1d"
      },
      "G": {
        "symbol": "G",
        "role": "NORMAL",
        "hp": 1,
        "color": "#41b06e"
      },
      "B": {
        "symbol": "B",
        "role": "NORMAL",
        "hp": 1,
        "color": "#2f6fed"
      },
      "Y": {
        "symbol": "Y",
        "role": "NORMAL",
        "hp": 1,
        "color": "#f4b740"
      },
      "P": {
        "symbol": "P",
        "role": "NORMAL",
        "hp": 1,
        "color": "#b06ab3"
      },
      "C": {
        "symbol": "C",
        "role": "NORMAL",
        "hp": 1,
        "color": "#4ecdc4"
      },
      "O": {
        "symbol": "O",
        "role": "NORMAL",
        "hp": 1,
        "color": "#ff7b54"
      },
      "D": {
        "symbol": "D",
        "role": "NORMAL",
        "hp": 2,
        "color": "#f4b740"
      },
      "E": {
        "symbol": "E",
        "role": "NORMAL",
        "hp": 3,
        "color": "#b06ab3"
      },
      "F": {
        "symbol": "F",
        "role": "NORMAL",
        "hp": 4,
        "color": "#ff7b54"
      },
      "M": {
        "symbol": "M",
        "role": "BOMB",
        "hp": 1,
        "color": "#111111"
      },
      "L": {
        "symbol": "L",
        "role": "PRISM",
        "hp": 1,
        "color": "#7dd3fc"
      },
      "K": {
        "symbol": "K",
        "role": "CORE",
        "hp": 5,
        "color": "#f59e0b"
      },
      "A": {
        "symbol": "A",
        "role": "NORMAL",
        "hp": 2,
        "color": "#4ecdc4"
      },
      "H": {
        "symbol": "H",
        "role": "NORMAL",
        "hp": 2,
        "color": "#41b06e"
      },
      "I": {
        "symbol": "I",
        "role": "NORMAL",
        "hp": 2,
        "color": "#ef1d1d"
      },
      "J": {
        "symbol": "J",
        "role": "NORMAL",
        "hp": 2,
        "color": "#2f6fed"
      },
      "N": {
        "symbol": "N",
        "role": "NORMAL",
        "hp": 2,
        "color": "#ff7b54"
      },
      "Q": {
        "symbol": "Q",
        "role": "NORMAL",
        "hp": 2,
        "color": "#b06ab3"
      }
    },
    "rleGrid": "42.|42.|.A2PDHAIBJARHRORJOBONAIQCIJOGHICPRDOCHA2Q.|.IYGIBQROPINI2BJ2IAPB.HODIQGB2NH2GDCJAHCB.|.IDGAQJHBRDBJYQGIPR5.AHODPBYDGHAIOCYBN.|.BGDNQRDQRNGONRJQPN5.G2BCGPCRNCAJDRBJI.|.IDG2P2BAPHPYRNYHP7.HICQDYIPHNCAG2YH.|.HAGRNOBY2R2BNONYNO5.JCDQ2YNPDPYDBJDCY.|.NRYHCDAD2QNOIJOIRA5.QYBJBC2YCBJDCYGJY.|.2OCDRPHPORJHOYNHCPQB.RBPQ3.NAGQO2DRYCPC.|.HDG2RNHBNPARDCGYJYCRCNOH3.GCBNPHN2P2QBO.|.ODO2JRHIHDQDJPC2ABCIYRYGP3.IH2RGBOYG3N.|.CDYIPRN2YBOA2OBJA2RCPHDCGR3.ADJDIJDHYRO.|.HCOJRQ2CGHBGDYHRHGHNIBGIR3.JCYRHYHNDCQJ.|.RYAOI2CHOIYPDCJ2QOHBJIDND3.RNBQI2NPJIPY.|.JIOGYAJCQNACYJCQC2HDYOQDQ3.NGBNYHCBORNC.|.2QNIPIBQPRPCGDCODQBPIDNO3.CDPARBPINHRYJ.|.CRN3PI2OYQHNQAQDJ2H3O3.DIOBQPBARHGOAY.|.JOIYPGROBYIYJAO2QYQ2JQ3.O2PDBHBAYAG2QND.|.YGPNYOJPOBJQRIOQHRYDOY3.NGRICAJA2DBAHJG.|.HPHBHO2AYJHIYAORQJCPR3.YJRNRDSRICQPGNDH.|.GRHAIOROBQPY2QNQAC2RNI3.OPBNGSRPJQHIDGI.|.2A2YBDCNGCNRDIJA2GNCJAD3.JQPBS2OIPQIQYJ.|.HDIQJHQRARCI2G2RB2NRDP3.GHDRASPARBYSPRB.|.JBDY2IHAHNICIHYAN2GJO3.AJCINYSQHCNOSHAG.|.JHDSJGASJGJRQN2GBQIB3.JRJPCYISBYI2DSIHJ.|.HNRSJHJSDHAIR2QYJOJ3.JCJNCJNOSNOGQNSHJR.|.BNJSGPJSYDINA2IPAGI3.BQPHADIHCADRCISPCJ.|.2NCSHOGSACANHR2QHJ3.RYNOCPAJIBGPIYDSCYC.|.OGBSJNYSGDHOYGIYQG3.YHARIPHI2GAIHJHSOJI.|.OCHSCOBS2GCDNDACHR3.GBJRCHIPDR2PYADSAOG.|.CDNSOHJSPNJYHG2QI3.ICJAJNQDCNHPCQRNSBIQ.|.DNISCPRSCGODCBDRAN3.DQRBNJDQROPBOA2PAPC.|.YNQSNRNHDADCJDPICH3.QHIBJIHAB2YRARQNPYR.|.QGCDJPBHRY2PNINYDRD3.RDBDQJOIHBJYGIJPBQ.|.RANYRIBDQPCGBYDYHBJ3.POYHAHNI2OHBG2ORIC.|42.|42.",
    "mechanics": {
      "initialSkills": {
        "multiLaunch": 3,
        "tripleSplit": 2
      }
    },
    "difficultyScore": {
      "totalScore": 81,
      "tier": "EXPERT",
      "breakableCount": 1217,
      "steelOcclusionRatio": 1,
      "simBreakRate20s": 0.07477403451109284,
      "hasDeadZoneWarning": false
    }
  },
  {
    "version": 1,
    "id": "builtin-18",
    "name": "精选关卡 18",
    "cols": 42,
    "rows": 38,
    "palette": {
      ".": {
        "symbol": ".",
        "role": "EMPTY",
        "hp": 0,
        "color": "#000000"
      },
      "S": {
        "symbol": "S",
        "role": "STEEL",
        "hp": 9999,
        "color": "#9aa4b2"
      },
      "R": {
        "symbol": "R",
        "role": "NORMAL",
        "hp": 1,
        "color": "#ef1d1d"
      },
      "G": {
        "symbol": "G",
        "role": "NORMAL",
        "hp": 1,
        "color": "#41b06e"
      },
      "B": {
        "symbol": "B",
        "role": "NORMAL",
        "hp": 1,
        "color": "#2f6fed"
      },
      "Y": {
        "symbol": "Y",
        "role": "NORMAL",
        "hp": 1,
        "color": "#f4b740"
      },
      "P": {
        "symbol": "P",
        "role": "NORMAL",
        "hp": 1,
        "color": "#b06ab3"
      },
      "C": {
        "symbol": "C",
        "role": "NORMAL",
        "hp": 1,
        "color": "#4ecdc4"
      },
      "O": {
        "symbol": "O",
        "role": "NORMAL",
        "hp": 1,
        "color": "#ff7b54"
      },
      "D": {
        "symbol": "D",
        "role": "NORMAL",
        "hp": 2,
        "color": "#f4b740"
      },
      "E": {
        "symbol": "E",
        "role": "NORMAL",
        "hp": 3,
        "color": "#b06ab3"
      },
      "F": {
        "symbol": "F",
        "role": "NORMAL",
        "hp": 4,
        "color": "#ff7b54"
      },
      "M": {
        "symbol": "M",
        "role": "BOMB",
        "hp": 1,
        "color": "#111111"
      },
      "L": {
        "symbol": "L",
        "role": "PRISM",
        "hp": 1,
        "color": "#7dd3fc"
      },
      "K": {
        "symbol": "K",
        "role": "CORE",
        "hp": 5,
        "color": "#f59e0b"
      }
    },
    "rleGrid": "42S|S40RS|S40RS|S40RS|S40RS|S40RS|S40RS|S40RS|S40RS|S40RS|S10R21.9RS|S10R21.9RS|S10R21.9RS|S10R21.9RS|S10R21.9RS|S10R21.9RS|S10R21.9RS|S10R21.9RS|S10R21.9RS|S10R21.9RS|S10R21.9RS|S10R21.9RS|S10R21.9RS|S10R21.9RS|S10R21.9RS|S10R21.9RS|S10R21.9RS|S10R21.9RS|S10R21.9RS|S40RS|S40RS|S40RS|S40RS|S40RS|S40RS|S40RS|S40RS|18S7R17S",
    "mechanics": {
      "initialSkills": {
        "multiLaunch": 3,
        "tripleSplit": 2
      }
    },
    "difficultyScore": {
      "totalScore": 81,
      "tier": "EXPERT",
      "breakableCount": 1048,
      "steelOcclusionRatio": 0.2684563758389262,
      "simBreakRate20s": 0.019083969465648852,
      "hasDeadZoneWarning": false
    }
  },
  {
    "version": 1,
    "id": "builtin-19",
    "name": "精选关卡 19",
    "cols": 42,
    "rows": 38,
    "palette": {
      ".": {
        "symbol": ".",
        "role": "EMPTY",
        "hp": 0,
        "color": "#000000"
      },
      "S": {
        "symbol": "S",
        "role": "STEEL",
        "hp": 9999,
        "color": "#9aa4b2"
      },
      "R": {
        "symbol": "R",
        "role": "NORMAL",
        "hp": 1,
        "color": "#ef1d1d"
      },
      "G": {
        "symbol": "G",
        "role": "NORMAL",
        "hp": 1,
        "color": "#41b06e"
      },
      "B": {
        "symbol": "B",
        "role": "NORMAL",
        "hp": 1,
        "color": "#2f6fed"
      },
      "Y": {
        "symbol": "Y",
        "role": "NORMAL",
        "hp": 1,
        "color": "#f4b740"
      },
      "P": {
        "symbol": "P",
        "role": "NORMAL",
        "hp": 1,
        "color": "#b06ab3"
      },
      "C": {
        "symbol": "C",
        "role": "NORMAL",
        "hp": 1,
        "color": "#4ecdc4"
      },
      "O": {
        "symbol": "O",
        "role": "NORMAL",
        "hp": 1,
        "color": "#ff7b54"
      },
      "D": {
        "symbol": "D",
        "role": "NORMAL",
        "hp": 2,
        "color": "#f4b740"
      },
      "E": {
        "symbol": "E",
        "role": "NORMAL",
        "hp": 3,
        "color": "#b06ab3"
      },
      "F": {
        "symbol": "F",
        "role": "NORMAL",
        "hp": 4,
        "color": "#ff7b54"
      },
      "M": {
        "symbol": "M",
        "role": "BOMB",
        "hp": 1,
        "color": "#111111"
      },
      "L": {
        "symbol": "L",
        "role": "PRISM",
        "hp": 1,
        "color": "#7dd3fc"
      },
      "K": {
        "symbol": "K",
        "role": "CORE",
        "hp": 5,
        "color": "#f59e0b"
      }
    },
    "rleGrid": "42S|S40RS|S40RS|S40RS|S40RS|S40RS|S40RS|S40RS|S40RS|S40RS|S40RS|S40RS|S40RS|S40RS|S40RS|S40RS|S40RS|S40RS|S40RS|S40RS|S40RS|S40RS|S40RS|S40RS|S40RS|S40RS|S40RS|S40RS|S40RS|S40RS|S40RS|S40RS|S40RS|S40RS|S40RS|S40RS|S40RS|18S7R17S",
    "mechanics": {
      "initialSkills": {
        "multiLaunch": 3,
        "tripleSplit": 2
      }
    },
    "difficultyScore": {
      "totalScore": 81,
      "tier": "EXPERT",
      "breakableCount": 1447,
      "steelOcclusionRatio": 0.2684563758389262,
      "simBreakRate20s": 0.013908085694540427,
      "hasDeadZoneWarning": false
    }
  },
  {
    "version": 1,
    "id": "builtin-20",
    "name": "精选关卡 20",
    "cols": 42,
    "rows": 38,
    "palette": {
      ".": {
        "symbol": ".",
        "role": "EMPTY",
        "hp": 0,
        "color": "#000000"
      },
      "S": {
        "symbol": "S",
        "role": "STEEL",
        "hp": 9999,
        "color": "#9aa4b2"
      },
      "R": {
        "symbol": "R",
        "role": "NORMAL",
        "hp": 1,
        "color": "#ef1d1d"
      },
      "G": {
        "symbol": "G",
        "role": "NORMAL",
        "hp": 1,
        "color": "#41b06e"
      },
      "B": {
        "symbol": "B",
        "role": "NORMAL",
        "hp": 1,
        "color": "#2f6fed"
      },
      "Y": {
        "symbol": "Y",
        "role": "NORMAL",
        "hp": 1,
        "color": "#f4b740"
      },
      "P": {
        "symbol": "P",
        "role": "NORMAL",
        "hp": 1,
        "color": "#b06ab3"
      },
      "C": {
        "symbol": "C",
        "role": "NORMAL",
        "hp": 1,
        "color": "#4ecdc4"
      },
      "O": {
        "symbol": "O",
        "role": "NORMAL",
        "hp": 1,
        "color": "#ff7b54"
      },
      "D": {
        "symbol": "D",
        "role": "NORMAL",
        "hp": 2,
        "color": "#f4b740"
      },
      "E": {
        "symbol": "E",
        "role": "NORMAL",
        "hp": 3,
        "color": "#b06ab3"
      },
      "F": {
        "symbol": "F",
        "role": "NORMAL",
        "hp": 4,
        "color": "#ff7b54"
      },
      "M": {
        "symbol": "M",
        "role": "BOMB",
        "hp": 1,
        "color": "#111111"
      },
      "L": {
        "symbol": "L",
        "role": "PRISM",
        "hp": 1,
        "color": "#7dd3fc"
      },
      "K": {
        "symbol": "K",
        "role": "CORE",
        "hp": 5,
        "color": "#f59e0b"
      },
      "A": {
        "symbol": "A",
        "role": "NORMAL",
        "hp": 2,
        "color": "#2f6fed"
      },
      "H": {
        "symbol": "H",
        "role": "NORMAL",
        "hp": 2,
        "color": "#b06ab3"
      },
      "I": {
        "symbol": "I",
        "role": "NORMAL",
        "hp": 2,
        "color": "#ff7b54"
      },
      "J": {
        "symbol": "J",
        "role": "NORMAL",
        "hp": 2,
        "color": "#4ecdc4"
      },
      "N": {
        "symbol": "N",
        "role": "NORMAL",
        "hp": 2,
        "color": "#ef1d1d"
      },
      "Q": {
        "symbol": "Q",
        "role": "NORMAL",
        "hp": 2,
        "color": "#41b06e"
      }
    },
    "rleGrid": "42.|42.|.ARYOHAIJYID2CARYNAYPYOIGDCNOD2APGJNPHPAJ.|.2OD2RNIAPQJIHPQCONAD.ODCGIRNAS2OJAYAYHNI.|.QPBIPCBNRYAQHRINOI5.JICHQYSJARHIHJNHY.|.BYCQDNON2QGPNO4H5.RCOYPISDADIDBQIOY.|.IRCPHYO2G2BDP2JOH7.2PJCQSRDQAJIJBJC.|.QDQRJYGN2QDNQJQ2CP5.CJPGNBSR2CYQBIQBQ.|.QBNAHYPRNBAOD2JQJA5.CPRIBHS2NAH2ROABO.|.IOGYIYNPCQD3.NDIOCH.BDBHQPJDS2YDHBYINCI.|.DYPCDAYQOR3.CIY2NPNJYAGJ2G2DSNIGBOIPHCB.|.YJOPHNQ2H3.PAPQPHOPQAROQYORNSYPDNJIYPQR.|.IYCNHNHRY3.QROPJHO2BCHQGAQOQSDNPH2GCDRH.|.HQJ2YPAIH3.HPHOYHGHAYHCPBNQBSYRGP2QIHIC.|.RAYQJDOGCJ3.APNCYOCGHPJQ2JODSA2DPJHAIBO.|.NCANIGHGOC3.NO2IAB2DNQDRQANCABP2DPDHDPH.|.QPC2PCNSJCQ3.AYIOJQDQJANICRBCOJIDQCBO2J.|.RPYBYJYSCP2H3.JCJAHQBNAOGPHYGPCQN2ROPSQ.|.DNBQHNJSCA2PH3.RNPOBNGQRNCHYDYDGRQRPQSG.|.DBDCGJNSHDGI3.JNIBIYJAGPB2NJROHYODPRBSC.|.JNOJAIRSQPRQ3.NIRDA2CRJPOGR2YRYCOAYPOSQ.|.QC2AN2YSJBJGC3.CAGDAJRIBIHA2GQIGOAJYNSC.|.DQCNRNQSQOYND3.CRCNIHJYBICHDOGAQJRYDGSA.|.JHOBC2DJPGRAJY3.JDO2GQJABCGYHBIBYIAPDQN.|.NG2AIGCHANQIRC3.OGQ2NYCRCDYCDGOJNSJ2PIJ.|.YRBGINAONBIHQNC3.QBYRQIRPHPDHARCASYOQYD.|.PNJINRDQPOPBHPJ3.CGPICPQDBHABNCYGSJCOBJ.|.ASCYHIDPJH2DYPOH3.JQGOHBDNRJQDBADSPRJDO.|.ISCIPHPHPOCG2HCOG3.NDOJBOQPIOBJODSJOYBD.|.ASGCQGNYNAYIYBQBQ3.NJHDQOI2DJCAJDSGO2HP.|.QSR2OCDBJCBNPOJIP3.RIHIC2GCDQCAYDSHQPGH.|.BSNGIBY2JNGAPDOBH3.CHQYQIRQNIYRJASCNHCB.|.NSBOCYJCYIRY2JOD3.IGIQYPQ2RHQO2D2OQRDBG.|.NSINPDHPGHJDOYIAO3.NID2RCBDPBO2HBO2JN2B.|.QHC2RNIAG2NRQCROIA3.2JHQJNACD2QHANPDJHJ.|.Y2AHJAGHYGAJAGDPOPR3.2ADRAIDHYJARODAGNH.|42.|42.",
    "mechanics": {
      "initialSkills": {
        "multiLaunch": 3,
        "tripleSplit": 2
      }
    },
    "difficultyScore": {
      "totalScore": 82,
      "tier": "EXPERT",
      "breakableCount": 1210,
      "steelOcclusionRatio": 1,
      "simBreakRate20s": 0.06487603305785124,
      "hasDeadZoneWarning": false
    }
  }
];
