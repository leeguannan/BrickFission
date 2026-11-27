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
        "color": "#41b06e"
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
        "color": "#b06ab3"
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
        "color": "#ef1d1d"
      },
      "Q": {
        "symbol": "Q",
        "role": "NORMAL",
        "hp": 2,
        "color": "#4ecdc4"
      }
    },
    "rleGrid": "42.|42.|16.O8.O16.|16.2O6.2O16.|16.2YA4.A2Y16.|11.2Y3.2YA4.A2Y3.2Y11.|10.3Y16.3Y10.|9.3Y2H.O10.O.2H3Y9.|11.3HRO10.OR3H11.|12.H3R.I6.I.3RH12.|12.O2R3.I4.I3.2RO12.|7.2O3.2O3.CJ4.JC3.2O3.2O7.|7.2O2Y2.I2.2DC4.C2D2.I2.2Y2O7.|9.AY3.IJCDP4.PDCJI3.YA9.|8.2A5.D2JP4.P2JD5.2A8.|10.3R2.2J2R4.2R2J2.3R10.|10.2R3.2N2Q4.2Q2N3.2R10.|10.3R2.2JRJ4.JR2J2.3R10.|8.3A4.DJ.P4.P.JD4.3A8.|9.AY3.IJCDP4.PDCJI3.YA9.|7.2O2Y2.I2.2DC4.C2D2.I2.2Y2O7.|7.2O3.2O3.CJ4.JC3.2O3.2O7.|12.O2R12.2RO12.|12.H3R.I6.I.3RH12.|11.3HRO10.OR3H11.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.",
    "mechanics": {
      "initialSkills": {
        "multiLaunch": 3,
        "tripleSplit": 2
      }
    },
    "difficultyScore": {
      "totalScore": 15,
      "tier": "EASY",
      "breakableCount": 242,
      "steelOcclusionRatio": 0,
      "simBreakRate20s": 0.6487603305785123,
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
      }
    },
    "rleGrid": "42.|42.|16.A8.A16.|14.2H2A6.2A2H14.|14.2H2A6.2A2H14.|15.H2YI4.I2YH15.|14.Y2AYI4.IY2AY14.|14.2YA2Y4.2YA2Y14.|15.YARD4.DRAY15.|8.H2.Y5.RD4.DR5.Y2.H8.|7.4H2Y5.R4.R5.2Y4H7.|7.2AH2A2Y4.O4.O4.2Y2AH2A7.|7.3AY2AR4.R4.R4.R2AY3A7.|9.I3YD3R8.3RD3YI9.|9.3I2YD.2O6.2O.D2Y3I9.|9.3B2.Y2P8.2PY2.3B9.|9.3B3.3B6.3B3.3B9.|9.3B.2Y2P.B4.B.2P2Y.3B9.|9.3IY2D.OR6.RO.2DY3I9.|9.I3YD3R8.3RD3YI9.|7.3AY2AR4.R4.R4.R2AY3A7.|7.2AH2A2Y4.O4.O4.2Y2AH2A7.|7.4H2Y5.D4.D5.2Y4H7.|8.H2.Y5.RD4.DR5.Y2.H8.|15.YARD4.DRAY15.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.",
    "mechanics": {
      "initialSkills": {
        "multiLaunch": 3,
        "tripleSplit": 2
      }
    },
    "difficultyScore": {
      "totalScore": 16,
      "tier": "EASY",
      "breakableCount": 274,
      "steelOcclusionRatio": 0,
      "simBreakRate20s": 0.5424270072992701,
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
        "color": "#ef1d1d"
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
        "color": "#41b06e"
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
      }
    },
    "rleGrid": "42.|42.|16.P2A4.2AP16.|14.2H2PA4.A2P2H14.|12.2Y2H2PA4.A2P2H2Y12.|13.2YH2O6.2OH2Y13.|13.Y.2IO6.O2I.Y13.|13.C2.I2O4.2OI2.C13.|8.3Y.3C.I8.I.3C.3Y8.|8.H2Y.3CPB8.BP3C.2YH8.|7.4H2.C2P2B6.2B2PC2.4H7.|7.2PH2I2.B2P2B4.2B2PB2.2IH2P7.|7.3PO2I.2BPYP4.PYP2B.2IO3P7.|6.3A.3O3.P2Y4.2YP3.3O.3A6.|6.3A6.D2BY4.Y2BD6.3A6.|6.3J3.2N.2ODH4.HD2O.2N3.3J6.|6.3J3.3N4G4.4G3N3.3J6.|6.3J3.N2.2OD6.D2O2.N3.3J6.|6.3A6.DBPY4.YPBD6.3A6.|6.3A.3O3.P2Y4.2YP3.3O.3A6.|7.3PO2I.2BPYP4.PYP2B.2IO3P7.|7.2PH2I2.3P2B4.2B3P2.2IH2P7.|7.4H2.C2P2B6.2B2PC2.4H7.|8.H2Y.3CPB8.BP3C.2YH8.|8.3Y.3C.I8.I.3C.3Y8.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.",
    "mechanics": {
      "initialSkills": {
        "multiLaunch": 3,
        "tripleSplit": 2
      }
    },
    "difficultyScore": {
      "totalScore": 17,
      "tier": "EASY",
      "breakableCount": 352,
      "steelOcclusionRatio": 0,
      "simBreakRate20s": 0.3277698863636364,
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
        "color": "#4ecdc4"
      }
    },
    "rleGrid": "42.|42.|17.AS4.SA17.|14.2S2.S4.S2.2S14.|12.2SHS2.S4.S2.SH2S12.|11.SI2AS2.S4.S2.S2AIS11.|10.S2IS.RS.G4.G.SR.S2IS10.|9.S3IS2.S8.S2.S3IS9.|8.S2AI2RS.S.S4.S.S.S2RI2AS8.|8.S2A.3R.S.P4.P.S.3R.2AS8.|7.4H2.R2.JS6.SJ2.R2.4H7.|9.H2R2.S2.JN4.NJ2.S2.2RH9.|11.2R.2J2.I4.I2.2J.2R11.|6.4S3.S2.S8.S2.S3.4S6.|6.S2AG2S2JPONS6.SNOP2J2SG2AS6.|6.S2C3D2.3JO6.O3J2.3D2CS6.|6.S2C3D6.S4.S6.3D2CS6.|6.S2C3D.4JOH4.HO4J.3D2CS6.|6.S2A3GJ2PONI6.INO2PJ3G2AS6.|6.3AG3.P2.I8.I2.P3.G3A6.|11.SR.2J2.S4.S2.2J.RS11.|9.2SR5.SN4.NS5.R2S9.|7.HSHS2.S2.SJP4.PJS2.S2.SHSH7.|8.SAS.SRS.S.S4.S.S.SRS.SAS8.|8.3AI3R.R.P4.P.R.3RI3A8.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.",
    "mechanics": {
      "initialSkills": {
        "multiLaunch": 3,
        "tripleSplit": 2
      }
    },
    "difficultyScore": {
      "totalScore": 36,
      "tier": "MEDIUM",
      "breakableCount": 218,
      "steelOcclusionRatio": 1,
      "simBreakRate20s": 0.2310779816513762,
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
        "color": "#2f6fed"
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
        "color": "#b06ab3"
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
        "color": "#ef1d1d"
      }
    },
    "rleGrid": "42.|42.|42.|42.|12.GS2.3S4.3S2.SG12.|13.2S.2RA4.A2R.2S13.|13.2S2.SH4.HS2.2S13.|12.SIDS.2J4.2J.SDIS12.|8.G3S2I.R2.S4.S2.R.2I3SG8.|9.G2DI3.S.J4.J.S3.I2DG9.|11.DR3.AS6.SA3.RD11.|12.2RA2.PN4.NP2.A2R12.|9.2S3.2A2OP4.P2O2A3.2S9.|9.SR2SJ.NPOB4.BOPN.J2SRS9.|8.SA3H.J.2NB4.B2N.J.3HAS8.|8.SB3G4.2P4.2P4.3GBS8.|8.SB2G3.4R4.4R3.2GBS8.|8.SB3G4.PN4.NP4.3GBS8.|8.3A2H2J.N.B4.B.N.2J2H3A8.|9.SR3J.NPOB4.BOPN.3JRS9.|9.2R3.2A2OS4.S2O2A3.2R9.|12.SR3.2S4.2S3.RS12.|11.2S3.SAS4.SAS3.2S11.|9.2SDS3.A.S4.S.A3.SD2S9.|8.3G3I.R2.J4.J2.R.3I3G8.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.",
    "mechanics": {
      "initialSkills": {
        "multiLaunch": 3,
        "tripleSplit": 2
      }
    },
    "difficultyScore": {
      "totalScore": 38,
      "tier": "MEDIUM",
      "breakableCount": 198,
      "steelOcclusionRatio": 1,
      "simBreakRate20s": 0.2152777777777778,
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
      }
    },
    "rleGrid": "42.|42.|16.S8.S16.|14.2SAS6.SA2S14.|14.2AHS6.SH2A14.|15.SHS6.SHS15.|10.S4.SHIS4.SIHS4.S10.|9.SYS3.S3I4.3IS3.SYS9.|8.S2YAS.SY2I6.2IYS.SA2YS8.|8.SY3AS3Y8.3YS3AYS8.|7.S2R.A3D3Y6.3Y3DA.2RS7.|7.2S3.2D2BYO6.OY2B2D3.2S7.|7.2R4.S2BP2O4.2OP2BS4.2R7.|13.SRB2P6.2PBRS13.|10.3SDR2BAH4.HA2BRD3S10.|10.S4D2.2A4.2A2.4DS10.|10.S4D2.2H4.2H2.4DS10.|10.5D2.2A4.2A2.5D10.|11.2D2R2B2H4.2H2B2R2D11.|13.SRB2P6.2PBRS13.|7.2S4.S2BP2O4.2OP2BS4.2S7.|7.2S3.SD2BYS6.SY2BDS3.2S7.|7.2RS.S3D3Y6.3Y3DS.S2R7.|8.SYS2AD2YS8.S2YD2ASYS8.|8.3Y2A.2Y2I6.2I2Y.2A3Y8.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.",
    "mechanics": {
      "initialSkills": {
        "multiLaunch": 3,
        "tripleSplit": 2
      }
    },
    "difficultyScore": {
      "totalScore": 45,
      "tier": "MEDIUM",
      "breakableCount": 238,
      "steelOcclusionRatio": 1,
      "simBreakRate20s": 0.18697478991596636,
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
    "rleGrid": "42.|42.|17.YS4.SY17.|18.S4.S18.|12.2S4.Y4.Y4.2S12.|11.S3A12.3AS11.|11.3A14.3A11.|12.S16.S12.|12.S4.2S4.2S4.S12.|8.S2.SDS.2S2R4.2R2S.SDS2.S8.|7.SH2S3DS3IR4.R3IS3D2SHS7.|7.S4H2D2J2I6.2I2J2D4HS7.|7.S5HR3J8.3JR5HS7.|6.S2AI3H3R10.3R3HI2AS6.|6.S2A3I2.R3H6.3HR2.3I2AS6.|6.S2A3I3.2IH6.H2I3.3I2AS6.|6.S2A3I3.3I6.3I3.3I2AS6.|6.S2A3I3.2IH6.H2I3.3I2AS6.|6.S2A3I.2R2H8.2H2R.3I2AS6.|6.3AI3H3R10.3R3HI3A6.|7.S5HR3J8.3JR5HS7.|7.S4H2D2J2I6.2I2J2D4HS7.|7.4H3DJ3IR4.R3IJ3D4H7.|8.H2.3D.2I2R4.2R2I.3D2.H8.|12.D4.2R4.2R4.D12.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.",
    "mechanics": {
      "initialSkills": {
        "multiLaunch": 3,
        "tripleSplit": 2
      }
    },
    "difficultyScore": {
      "totalScore": 47,
      "tier": "MEDIUM",
      "breakableCount": 282,
      "steelOcclusionRatio": 1,
      "simBreakRate20s": 0.1875,
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
    "rleGrid": "42.|42.|16.S8.S16.|14.2SAS6.SA2S14.|12.2S2CAS6.SA2C2S12.|11.SG2AC2PS4.S2PC2AGS11.|10.S2GA.2CPA4.AP2C.A2GS10.|9.S3G3.C2P4.2PC3.3GS9.|8.S2AG4.CH6.HC4.G2AS8.|8.S2A4.HIH6.HIH4.2AS8.|7.S3C3.2H2IH4.H2I2H3.3CS7.|7.SA3C2.I2HIJ4.JI2HI2.3CAS7.|7.3AP2CH2IHCJ4.JCH2IH2CP3A7.|9.S3P.2HJ2C4.2CJ2H.3PS9.|9.S2A2C.R2JC4.C2JR.2C2AS9.|6.3S3N2.C2.R6.R2.C2.3N3S6.|6.S2A3N3.3Y6.3Y3.3N2AS6.|6.3A3N.2C2.RI4.IR2.2C.3N3A6.|9.S2AC2.R2JC4.C2JR2.C2AS9.|9.S3P.2HJ2C4.2CJ2H.3PS9.|7.2SAP2CH2IHCJ4.JCH2IH2CPA2S7.|7.SA3C2.S2HIJ4.JI2HS2.3CAS7.|7.3CS3.2HIS6.SI2H3.S3C7.|8.SAS4.HIS6.SIH4.SAS8.|8.3AG4.CH6.HC4.G3A8.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.",
    "mechanics": {
      "initialSkills": {
        "multiLaunch": 3,
        "tripleSplit": 2
      }
    },
    "difficultyScore": {
      "totalScore": 51,
      "tier": "MEDIUM",
      "breakableCount": 298,
      "steelOcclusionRatio": 1,
      "simBreakRate20s": 0.1669463087248322,
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
