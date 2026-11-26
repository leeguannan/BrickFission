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
        "color": "#ef1d1d"
      }
    },
    "rleGrid": "42.|42.|42.|42.|16.2S6.2S16.|14.2SAS6.SA2S14.|13.SH2AIS4.SI2AHS13.|12.3H.S2I4.2IS.3H12.|13.H2.SI6.IS2.H13.|16.S8.S16.|15.S.S6.S.S15.|14.S3.S4.S3.S14.|14.CS2.S4.S2.SC14.|9.S5.S2.S4.S2.S5.S9.|8.2S3.S.3SJ4.J3S.S3.2S8.|8.2S3.2S2B2A4.2A2B2S3.2S8.|8.2S2.3OBS8.SB3O2.2S8.|8.2S3.2O2B2S4.2S2B2O3.2S8.|8.3Y4.SC2J4.2JCS4.3Y8.|9.Y5.S2.S4.S2.S5.Y9.|14.2S.SN4.NS.2S14.|14.2CSNH4.HNS2C14.|15.3C6.3C15.|16.S8.S16.|13.H2.2I6.2I2.H13.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.",
    "mechanics": {
      "initialSkills": {
        "multiLaunch": 3,
        "tripleSplit": 2
      }
    },
    "difficultyScore": {
      "totalScore": 21,
      "tier": "EASY",
      "breakableCount": 88,
      "steelOcclusionRatio": 1,
      "simBreakRate20s": 0.4275568181818182,
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
      },
      "N": {
        "symbol": "N",
        "role": "NORMAL",
        "hp": 2,
        "color": "#ff7b54"
      }
    },
    "rleGrid": "42.|42.|42.|42.|12.2S2.3S4.3S2.2S12.|11.S2A2S2CA4.A2C2S2AS11.|10.S2A2G2CAH4.HA2C2G2AS10.|9.S2P3G.S2A4.2AS.3G2PS9.|8.3P2CG2.SA6.AS2.G2C3P8.|9.P3C3.S8.S3.3CP9.|11.C3.2CS6.S2C3.C11.|16.CIS4.SIC16.|13.S3.2I4.2I3.S13.|13.3S10.3S13.|10.3SJIJ2S6.2SJIJ3S10.|10.S2C2J3NS4.S3N2J2CS10.|10.SC3J2NRS4.SR2N3JCS10.|10.3C2J4N4.4N2J3C10.|11.2C2I2J8.2J2I2C11.|13.SIJ10.JIS13.|13.I3.2S4.2S3.I13.|16.SIR4.RIS16.|11.S3.3C6.3C3.S11.|9.2SCS3.S8.S3.SC2S9.|8.3P2CG2.2A6.2A2.G2C3P8.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.",
    "mechanics": {
      "initialSkills": {
        "multiLaunch": 3,
        "tripleSplit": 2
      }
    },
    "difficultyScore": {
      "totalScore": 23,
      "tier": "EASY",
      "breakableCount": 174,
      "steelOcclusionRatio": 1,
      "simBreakRate20s": 0.46839080459770116,
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
        "color": "#41b06e"
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
      },
      "Q": {
        "symbol": "Q",
        "role": "NORMAL",
        "hp": 2,
        "color": "#ef1d1d"
      }
    },
    "rleGrid": "42.|42.|42.|42.|16.3S4.3S16.|14.2S2AH4.H2A2S14.|13.SI2AGD4.DG2AIS13.|12.S2I.S2G4.2GS.2IS12.|11.SRS2.SGS4.SGS2.SRS11.|10.3RS2.SRS4.SRS2.S3R10.|11.R3P3JR4.R3J3PR11.|12.PS2.SNO4.ONS2.SP12.|13.S2.S2N4.2NS2.S13.|9.S3.I2SJS6.SJ2SI3.S9.|8.SQ3S.I2AS6.S2AI.3SQS8.|8.SQ3D2.SJCS4.SCJS2.3DQS8.|8.SQDS3.SJPS4.SPJS3.SDQS8.|8.SQ2DS2.SJ2C4.2CJS2.S2DQS8.|8.3Q2D2SAS8.SA2S2D3Q8.|9.Q3.SIAJS6.SJAIS3.Q9.|13.S2.SNS4.SNS2.S13.|12.2S2.SNO4.ONS2.2S12.|11.S3P3JR4.R3J3PS11.|10.3RS2.SRS4.SRS2.S3R10.|11.2RI2.2GR4.R2G2.I2R11.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.",
    "mechanics": {
      "initialSkills": {
        "multiLaunch": 3,
        "tripleSplit": 2
      }
    },
    "difficultyScore": {
      "totalScore": 30,
      "tier": "EASY",
      "breakableCount": 166,
      "steelOcclusionRatio": 1,
      "simBreakRate20s": 0.24698795180722893,
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
        "color": "#2f6fed"
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
        "color": "#b06ab3"
      },
      "J": {
        "symbol": "J",
        "role": "NORMAL",
        "hp": 2,
        "color": "#ef1d1d"
      }
    },
    "rleGrid": "42.|42.|17.YS4.SY17.|18.S4.S18.|18.S4.S18.|18.S4.S18.|14.3S.C4.C.3S14.|13.S2RS8.S2RS13.|12.S2ARH2S4.2SHR2AS12.|11.S3AS.YS4.SY.S3AS11.|11.SRARS2.S4.S2.SRARS11.|10.2HRS.RS.S4.S.SR.SR2H10.|11.2HS2.3S4.3S2.S2H11.|6.4S3.HSYH2G4.2GHYSH3.4S6.|6.S2YC2S2.H.SAG4.GAS.H2.2SC2YS6.|6.S2I3D2S.2S8.2S.2S3D2IS6.|6.S2I3D3J3I6.3I3J3D2IS6.|6.S2I3DJ2.PS8.SP2.J3D2IS6.|6.S2Y3C.2S.3S4.3S.2S.3C2YS6.|6.3YC3.S2YH2G4.2GH2YS3.C3Y6.|11.3S2.SGS4.SGS2.3S11.|10.2H2R2SR.S4.S.R2S2R2H10.|11.SRARS2.S4.S2.SRARS11.|11.R3AS.2S4.2S.S3AR11.|12.3ARHYH4.HYHR3A12.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.",
    "mechanics": {
      "initialSkills": {
        "multiLaunch": 3,
        "tripleSplit": 2
      }
    },
    "difficultyScore": {
      "totalScore": 35,
      "tier": "MEDIUM",
      "breakableCount": 178,
      "steelOcclusionRatio": 1,
      "simBreakRate20s": 0.22752808988764045,
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
    "rleGrid": "42.|42.|42.|42.|12.GS2.3S4.3S2.SG12.|13.2S.2RA4.A2R.2S13.|13.2S2.SH4.HS2.2S13.|12.SIDS.2J4.2J.SDIS12.|8.G3S2I.R2.S4.S2.R.2I3SG8.|9.G2DS3.S.J4.J.S3.S2DG9.|11.DS3.AS6.SA3.SD11.|12.2RS2.2S4.2S2.S2R12.|9.2S3.A2SOP4.PO2SA3.2S9.|9.SR2SJ.NPOB4.BOPN.J2SRS9.|8.SA2HS.J.2NS4.S2N.J.S2HAS8.|8.SB3G4.2S4.2S4.3GBS8.|8.SBGS3.3RS4.S3R3.SGBS8.|8.SB2GS4.PS4.SP4.S2GBS8.|8.3A2HSJ.S.S4.S.S.JS2H3A8.|9.SR3J.SPSB4.BSPS.3JRS9.|9.2R3.2A2OS4.S2O2A3.2R9.|12.SR3.2S4.2S3.RS12.|11.2S3.SAS4.SAS3.2S11.|9.2SDS3.A.S4.S.A3.SD2S9.|8.3G3I.R2.J4.J2.R.3I3G8.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.",
    "mechanics": {
      "initialSkills": {
        "multiLaunch": 3,
        "tripleSplit": 2
      }
    },
    "difficultyScore": {
      "totalScore": 35,
      "tier": "MEDIUM",
      "breakableCount": 158,
      "steelOcclusionRatio": 1,
      "simBreakRate20s": 0.22705696202531644,
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
    "rleGrid": "42.|42.|17.YS4.SY17.|18.S4.S18.|12.2S4.Y4.Y4.2S12.|11.S3A12.3AS11.|11.3A14.3A11.|12.S16.S12.|12.S4.2S4.2S4.S12.|8.S2.SDS.2S2R4.2R2S.SDS2.S8.|7.SH2S3DS3IR4.R3IS3D2SHS7.|7.S4H2D2J2I6.2I2J2D4HS7.|7.S5HR3J8.3JR5HS7.|6.S2AI3H2RS10.S2R3HI2AS6.|6.S2A2IS2.RH2S6.2SHR2.S2I2AS6.|6.S2A2IS3.SIS6.SIS3.S2I2AS6.|6.S2A2IS3.SIS6.SIS3.S2I2AS6.|6.S2A2IS3.SIH6.HIS3.S2I2AS6.|6.S2A2IS.2S2H8.2H2S.S2I2AS6.|6.3AI2HS2RS10.S2RS2HI3A6.|7.S5HR2JS8.S2JR5HS7.|7.S4H2D2JIS6.SI2J2D4HS7.|7.4H3DJ3IS4.S3IJ3D4H7.|8.H2.3D.2I2R4.2R2I.3D2.H8.|12.D4.2R4.2R4.D12.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.",
    "mechanics": {
      "initialSkills": {
        "multiLaunch": 3,
        "tripleSplit": 2
      }
    },
    "difficultyScore": {
      "totalScore": 44,
      "tier": "MEDIUM",
      "breakableCount": 242,
      "steelOcclusionRatio": 1,
      "simBreakRate20s": 0.19679752066115702,
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
        "color": "#ef1d1d"
      },
      "I": {
        "symbol": "I",
        "role": "NORMAL",
        "hp": 2,
        "color": "#4ecdc4"
      }
    },
    "rleGrid": "42.|42.|16.S8.S16.|14.2SAS6.SA2S14.|14.2AHS6.SH2A14.|15.SHS6.SHS15.|10.S4.SHIS4.SIHS4.S10.|9.SYS3.S3I4.3IS3.SYS9.|8.S2YAS.SY2I6.2IYS.SA2YS8.|8.SY3AS2YS8.S2YS3AYS8.|7.S2R.A3D2YS6.S2Y3DA.2RS7.|7.2S3.2D2BYS6.SY2B2D3.2S7.|7.2R4.S2BP2O4.2OP2BS4.2R7.|13.SRBPS6.SPBRS13.|10.3SDR2BAS4.SA2BRD3S10.|10.S3DS2.2S4.2S2.S3DS10.|10.S3DS2.2S4.2S2.S3DS10.|10.4DS2.2S4.2S2.S4D10.|11.2D2R2S2H4.2H2S2R2D11.|13.SRBPS6.SPBRS13.|7.2S4.S2BP2O4.2OP2BS4.2S7.|7.2S3.SD2BYS6.SY2BDS3.2S7.|7.2RS.S3D3Y6.3Y3DS.S2R7.|8.SYS2AD2YS8.S2YD2ASYS8.|8.3Y2A.2Y2I6.2I2Y.2A3Y8.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.",
    "mechanics": {
      "initialSkills": {
        "multiLaunch": 3,
        "tripleSplit": 2
      }
    },
    "difficultyScore": {
      "totalScore": 47,
      "tier": "MEDIUM",
      "breakableCount": 204,
      "steelOcclusionRatio": 1,
      "simBreakRate20s": 0.17218137254901963,
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
        "color": "#b06ab3"
      }
    },
    "rleGrid": "42.|42.|42.|42.|42.|18.S4.S18.|10.S3.S3.G4.G3.S3.S10.|9.SRS.SAS10.SAS.SRS9.|8.4RS2AS.2S4.2S.S2AS4R8.|9.2R4AHS2D4.2DSH4A2R9.|11.S2AI3HD4.D3HI2AS11.|10.SJ2A2I2HR4.R2H2I2AJS10.|10.S2J4I8.4I2JS10.|6.3S.3J3I10.3I3J.3S6.|6.SHS3.SAS12.SAS3.SHS6.|6.SHS3.S2A2S.S4.S.2S2AS3.SHS6.|6.SHS3.S2A3RS4.S3R2AS3.SHS6.|6.SHS3.S2A2R.P4.P.2R2AS3.SHS6.|6.SHS3.SIS12.SIS3.SHS6.|6.3H.2SJ2IS10.S2IJ2S.3H6.|10.S2J3IS8.S3I2JS10.|10.2J2A2IH2S4.2SH2I2A2J10.|11.S2AI3HD4.D3HI2AS11.|9.2S4A2H2D4.2D2H4A2S9.|8.4R4A.2D4.2D.4A4R8.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.",
    "mechanics": {
      "initialSkills": {
        "multiLaunch": 3,
        "tripleSplit": 2
      }
    },
    "difficultyScore": {
      "totalScore": 51,
      "tier": "MEDIUM",
      "breakableCount": 214,
      "steelOcclusionRatio": 1,
      "simBreakRate20s": 0.16063084112149534,
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
        "color": "#2f6fed"
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
        "color": "#b06ab3"
      },
      "J": {
        "symbol": "J",
        "role": "NORMAL",
        "hp": 2,
        "color": "#41b06e"
      }
    },
    "rleGrid": "42.|42.|42.|42.|12.2S14.2S12.|11.SRGS.A2S4.2SA.SGRS11.|10.S2RGS2.SB4.BS2.SG2RS10.|9.S3RHDS.SA4.AS.SDH3RS9.|8.3GR3HS.SI4.IS.S3HR3G8.|9.2GD3HS.GI4.IG.S3HD2G9.|11.2DHJS2.G4.G2.SJH2D11.|12.DS.JS8.SJ.SD12.|10.S2.S2.JS6.SJ2.S2.S10.|9.SA2SISG.AS4.SA.GSI2SAS9.|9.S2B2RS3.S4.S3.S2R2BS9.|9.S2A2JR2S.S4.S.2SR2J2AS9.|9.S2A3J3HS4.S3H3J2AS9.|9.S2AJ2R2P.S4.S.2P2RJ2AS9.|9.S2BRIS3.S4.S3.SIR2BS9.|9.B3AI2G.SA4.AS.2GI3AB9.|10.A2.S2.SA6.AS2.S2.A10.|12.SD2SJ8.J2SDS12.|11.SDHJS2.S4.S2.SJHDS11.|9.2SD3HS.SI4.IS.S3HD2S9.|8.3GR3HD.GI4.IG.D3HR3G8.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.",
    "mechanics": {
      "initialSkills": {
        "multiLaunch": 3,
        "tripleSplit": 2
      }
    },
    "difficultyScore": {
      "totalScore": 53,
      "tier": "MEDIUM",
      "breakableCount": 198,
      "steelOcclusionRatio": 1,
      "simBreakRate20s": 0.14520202020202022,
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
        "color": "#ef1d1d"
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
        "color": "#2f6fed"
      },
      "N": {
        "symbol": "N",
        "role": "NORMAL",
        "hp": 2,
        "color": "#4ecdc4"
      }
    },
    "rleGrid": "42.|42.|16.S8.S16.|14.2SAS6.SA2S14.|12.2S2CAS6.SA2C2S12.|11.SG2AC2PS4.S2PC2AGS11.|10.S2GA.2CPA4.AP2C.A2GS10.|9.S3G3.S2P4.2PS3.3GS9.|8.S2AG4.2S6.2S4.G2AS8.|8.SAS4.SHS6.SHS4.SAS8.|7.S2CS3.SI2HS4.S2HIS3.S2CS7.|7.SA2CS2.S2IHJ4.JH2IS2.S2CAS7.|7.3APCSI2HICJ4.JCI2HISCP3A7.|9.S2PS.2IJ2C4.2CJ2I.S2PS9.|9.S2A2C.R2JC4.C2JR.2C2AS9.|6.3S2NS2.C2.S6.S2.C2.S2N3S6.|6.S2A2NS3.2YS6.S2Y3.S2N2AS6.|6.3A2NS.2C2.2S4.2S2.2C.S2N3A6.|9.S2AS2.2SJC4.CJ2S2.S2AS9.|9.S2PS.SIJ2C4.2CJIS.S2PS9.|7.2SAP2CI2HICJ4.JCI2HI2CPA2S7.|7.SA3C2.S2IHJ4.JH2IS2.3CAS7.|7.3CS3.2IHS6.SH2I3.S3C7.|8.SAS4.IHS6.SHI4.SAS8.|8.3AG4.CI6.IC4.G3A8.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.|42.",
    "mechanics": {
      "initialSkills": {
        "multiLaunch": 3,
        "tripleSplit": 2
      }
    },
    "difficultyScore": {
      "totalScore": 54,
      "tier": "MEDIUM",
      "breakableCount": 248,
      "steelOcclusionRatio": 1,
      "simBreakRate20s": 0.1461693548387097,
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
        "color": "#ff7b54"
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
        "color": "#ef1d1d"
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
    "rleGrid": "42.|42.|.SAHIOYBGRCGBIGDHDACBGCJ2SONPS2ARNDQPJHRB.|.DJISOGS2RPJDCOAGOCJO.RB2NSQBGOHRCGCO2NYI.|.GQBONPOSJC2PYSGJNH5.JODGHPJRPIQJACDRP.|.RDACBHIGJASQPGOJQG5.CHAQPINISNSDCIRIB.|.JSOBHIDSDAHQASYRD7.GJNHGBQBCHRBAPNR.|.QJSA2DGJCNIHGSDPIO5.NJBNDPAORPYPIBGJB.|.GHSANPJNCNSIDGIGQJ5.PASQNCPNO2JNRBJNY.|.BPACHJRCNYPCQYBQOASY.PR3.PDS2JYSBQYSAIO.|.DCAC2BGAJDJISQPOQCSGRBP3.SNPYGJGNORHCIP.|.OHBPGDPNAJHBDOBAPORJNBCD3.2CQHSQCJAN3C.|.PSBJYP2OI2BQSNDAQIAQGCG3.OPCHDSBQJIPGRP.|.BASYN2S2YARJSIACGHIORQ3.2RJDH2NOYCINSJC.|.IDAYBDBOYSAOBIC2PYGJGJ3.3NYDSDIPSRCONP.|.C2IJSBCSINCIGRN2GSACY3.SDQAQAROSQB2NPAS.|.QO2CGQCNYGJPSRIGNI2BGB3.Y2DHAPRDCBACHYP.|.O2PO2DPCRSJIBJOQISINC3.GDYB2N2DR2IJSDON.|.DYDCJIRD3BPBADNIDCN3.YJIBPDYDSC2HNOSYB.|.YRG2ARCBOYBQNRP2JBP3.QP2IQJCARAIHQCSJSJ.|.HQDCBPOYCYBRBNSIAIO3.YSQHQJBARDBAC2YGCG.|.2PGCQJAQB2JCHJADAIYQ3.JIRY2OPQCAYRCGBND.|.DPR2GIYSDJASJHIQASB3.BQ2JA2YRHIOSRJDCRI.|.YJHSBQ2BHSQRSIAJCHRB3.ASHBPCJIJN2SNGYRQ.|.NQJCS2JPDACYHGPJSDQ3.RAHDPSB2SPHCINOHNO.|.SBIGONDPGAQ2GJNYRP3.BGNYGHQSHANSYCIPDPJ.|.JQAIAGHJGHSBADJYSP3.OPJPIYGD3CJRBPABJP.|.YHDQYBOGDHPJISC2DBJ3.RIAJRIDCGCPJOSRBGI.|.NYN2AYCQRDHQASYDBRS3.SONYQRSJCQPOBSOJPH.|.SAQGY2RCQJ2ANSPGYAY3.CHJOHBJQYDBIYINYOJ.|.RICOS2HOQNPD2RBADO3.IBQNQBJHOBHABSHAYOG.|.R2BCYDABHDS2IHGSNR3.NAJCODSBCSR3HCD2IN.|.CPSIHRBRPQOBYBNCJRN3.RBSGIA3QCO2NPJ2PA.|.D2BIY2JBPHOYSYNRHIAD3.N2RQJICGHARPNCYJD.|.DQCQHQR2AOQI2YPCIBG3.DOHBJIDGR2OJNDQBJS.|.CBHGC3HRJNDNJP2NIA3.PIBNDGBRYD2CB2NYGO.|42.|42.",
    "mechanics": {
      "initialSkills": {
        "multiLaunch": 3,
        "tripleSplit": 2
      }
    },
    "difficultyScore": {
      "totalScore": 68,
      "tier": "HARD",
      "breakableCount": 1156,
      "steelOcclusionRatio": 1,
      "simBreakRate20s": 0.14370674740484427,
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
        "color": "#ff7b54"
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
        "color": "#ef1d1d"
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
    "rleGrid": "42.|42.|.SAHIOYBGRCGBIGDHDACBGCJ2SONP3ARNDQPJHRB.|.DJISOGS2RPJDCOAGOCJO.RB2NAQBGOHRCGCO2NYI.|.GQBONPODJC2PYSGJNH5.JODGHPJRPIQJACDRP.|.RDACBHIGJAOQPGOJQG5.CHAQPINIGNSDCIRIB.|.JSOBHIDBDAHQASYRD7.GJNHGBQBCHRBAPNR.|.QJRA2DGJCNIHG2DPIO5.NJBNDPAORPYPIBGJB.|.GHPANPJNCNSIDGIGQJ5.PAJQNCPNO2JNRBJNY.|.BPACHJRCNYPCQYBQOAOY.PR3.PDS2JYSBQYSAIO.|.DCAC2BGAJDJIAQPOQCSGRBP3.SNPYGJGNORHCIP.|.OHBPGDPNAJHBDOBAPORJNBCD3.2CQHSQCJAN3C.|.PSBJYP2OI2BQSNDAQIAQGCG3.OPCHDHBQJIPGRP.|.BAOYNSR2YARJOIACGHIORQ3.2RJDH2NOYCINIJC.|.IDAYBDBOYSAOBIC2PYGJGJ3.3NYDSDIPSRCONP.|.C2IJABCSINCIGRN2GSACY3.SDQAQARO2QB2NPAS.|.QO2CGQCNYGJPSRIGNI2BGB3.Y2DHAPRDCBACHYP.|.O2PO2DPC2RJIBJOQIRINC3.GDYB2N2DR2IJSDON.|.DYDCJIRD3BPBADNIDCN3.YJIBPDYDIC2HNOHYB.|.YRG2ARCBOYBQNRP2JBP3.QP2IQJCARAIHQCSJQJ.|.HQDCBPOYCYBRBNSIAIO3.YDQHQJBARDBAC2YGCG.|.2PGCQJAQB2JCHJADAIYQ3.JIRY2OPQCAYRCGBND.|.DPR2GIYADJASJHIQASB3.BQ2JA2YRHIOSRJDCRI.|.YJHSBQ2BHJQRSIAJCHRB3.ASHBPCJIJN2SNGYRQ.|.NQJCH2JPDACYHGPJSDQ3.RAHDPSB2SPHCINOHNO.|.ABIGONDPGAQ2GJNYRP3.BGNYGHQSHANAYCIPDPJ.|.JQAIAGHJG2HBADJYSP3.OPJPIYGD3CJRBPABJP.|.YHDQYBOGDHPJISC2DBJ3.RIAJRIDCGCPJOSRBGI.|.NYN2AYCQRDHQASYDBRG3.SONYQRSJCQPOBGOJPH.|.SAQGY2RCQJ2ANJPGYAY3.CHJOHBJQYDBIYINYOJ.|.RICOQ2HOQNPD2RBADO3.IBQNQBJHOBHABDHAYOG.|.R2BCYDABHDS2IHGSNR3.NAJCODQBCYR3HCD2IN.|.CPSIHRBRPQOBYBNCJRN3.RBCGIA3QCO2NPJ2PA.|.D2BIY2JBPHOYSYNRHIAD3.N2RQJICGHARPNCYJD.|.DQCQHQR2AOQI2YPCIBG3.DOHBJIDGR2OJNDQBJB.|.CBHGC3HRJNDNJP2NIA3.PIBNDGBRYD2CB2NYGO.|42.|42.",
    "mechanics": {
      "initialSkills": {
        "multiLaunch": 3,
        "tripleSplit": 2
      }
    },
    "difficultyScore": {
      "totalScore": 71,
      "tier": "HARD",
      "breakableCount": 1196,
      "steelOcclusionRatio": 1,
      "simBreakRate20s": 0.11507107023411371,
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
    "rleGrid": "42.|42.|.AHAOHIRCDGSO3JYBCP2JNCHBA4BOAYSIOGNJP.|.CGAPCSHYSRBC2AIQIAOP.SNHJNIBQAORDAIY2GYJ.|.OQYPRSYHJSGOYH2AOJ5.QHOHGDOSHJPNDRIDO.|.NSGICHR2HPN2JIRIHY5.NAOYIPSYRPHJOJNAR.|.DJAGNY2CGYIQBIROQ7.DOAIY2RG2BGAPDQO.|.OSBSNDJNJGRPJ2QBIH5.RABCJSGSDCSCYDBSB.|.IDRAIJ2PDGCOSIACAN5.CQHNQGNCSYNGHJORJ.|.SGQRYPYJDNDJR2ADJS3.INBJNGQHNJYNDOYNJHN.|.SPIBDQPADYHRS2CDB2Q3.PBPS2PJA2IQS2QNCPN.|.BRBAGCRCRPDQDYPBAG3.ICYGBQIOSPDQYDCHOJP.|.SGY2ICGJASOS2O2C2B3.PYIRAGBP2SPO3IDQPD.|.SYN2SPCPGYQYCJOG2PO3.IARONRBYRQOJDRSHRB.|.ARAG2YABRIOARGBSCO3.GQHCYODJBNHGONDYR2P.|.SDYIRBSNIJDGNRYGDGO3.NCOJIBOAQROHN2JANO.|.DGYASHPQPIDNPQCADI3.BGDJ2YSIHICHCPRBGBI.|.OGOGQAYPGADNDAOIC3.A2IOPNQ2PHSYSBPDJ2AP.|.GBJCGBRGCDBJCI2YB3.YISNSIJRYGIHCS2RDA2G.|.HIYOSQ2PGYOBDRHGPD3.OC2BYHCAI2HGQGIRHOH.|.SYNPSRGSIYHYORHQJ3.DAQCOJSYIYHOYJBIQRQP.|.A2SYCQRIHCDSGOGYBC3.2JOCROQODASDQHQHAHR.|.NAGDPHDHNAQNHDGQDYG3.YIPDGJNJAJDRGBAJHB.|.QAR2ICASAQI2CBPDIQO3.BIRIJCB3G2IABAIOR.|.HSC2GACRY2DRCPNQIYR3.2Y2APANRDIBQRSIOYC.|.NAQNSBGIQDHYNRSAPBOI3.APYOGQ2BAPDJCPIBI.|.R2DYSBAGHBCBPISYORAI3.IAQPNYJGHYIGJOPJA.|.ISHIDHCSNARIY2QJSBHO3.JQPY2PQDBANACBNOI.|.2GOCBSRYAS2JSQYDCYI3.BGCAPDSAGIRQY2SNRA.|.QOPHBSQRYIBJAHPDHQB3.JCYNC2BR2BRYPBSRID.|.RNJCORSIONYGAJCOYDJ3.DC2BDBYQHYDCYDBRGH.|.GHGHQNSQ2OISODPRQPGY3.OCYG2JCPSABDJ2HND.|.2NOYBGRHJHJNPSIOGS2Y3.QYIGJRJYNQNSIDPRH.|.GSRDIDCGBNP2QINCIYD3.INDPOPYAHNCHSARGJS.|.2NCN2PS2BSOCSDYCOGQ3.COSYRHNJYHIHDCBPRB.|.AJIOCJNH2AB2OYIJCGI3.OJNGDRDBPOPBCJIRJR.|42.|42.",
    "mechanics": {
      "initialSkills": {
        "multiLaunch": 3,
        "tripleSplit": 2
      }
    },
    "difficultyScore": {
      "totalScore": 74,
      "tier": "HARD",
      "breakableCount": 1166,
      "steelOcclusionRatio": 1,
      "simBreakRate20s": 0.12199828473413378,
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
    "rleGrid": "42.|42.|.AYHBIJCIS2IGOPJB2SN2OSIQDSQ2SNAQBOYQDPHJ.|.BI2CBCORSNAPGQIQPNAI.PYAODGCOCBSBQYQNBRS.|.GIRSNO2SYBONPOGOPD5.DHPYSPJBAYAYAPIQB.|.ROGRDCYNPIBASAJCNI5.BISNIRJPY2SCDRAGS.|.2AJYANPSIQASPGPIG7.AGSCQDAYOPISONQG.|.YBIJ2SISHRBYJHSNSD5.YINRSNSRPIHPHJRDY.|.J2ONOHIARAODAQRYCS5.DN2CQRJQHAPNDBNJS.|.PSBNBHCSHBNRJQ3.SIO.DY3SRQCOJQGAGQCPAS.|.NCOPSRSHRNQANR3.YHBYQ2HCIJOSCYDQPSDQ2OB.|.QO3SRYJORY3S3.DHDCH2QCOSINIYQHQISCSPA.|.GPQD2NAPDYSNHPA3.RIRGBHSYSY2JRBYAJSRIAI.|.SOGOQNRNRNJHRCD3.HNHQPRPAOASNGCABOPOIDA.|.CYCY2RDSJCGOGYN3.2RJDAQGIPGQS2JPHQPCAGH.|.ASQSY2PHSPIRN2RN3.NJYOARBNCNAI2AQ2HODCS.|.SDSORCNOSDGPYOAC3.RJGPDGJOCHS2NOCJBYDAB.|.SBHRH2CSNACDS2H3.IQGI2GAPRJORBAPC2DHAID.|.YARCHJRGDAPQRSY3.CBDISNP2HIHSDSIRAQBCSH.|.CIDYOHJCYPCPGHN3.BAGBSOPNGQNSJRISYPHQRS.|.J2RYBYD2HIC2BS3.SIYQSNQ2YSODQP2ABIBNHRS.|.DQOQDGJHCGNHJGO3.O2PS2ONY2ODHSOSQSJSDIA.|.SBRJ2RSBQRJGYDG3.CRINDYSRCO2BDRSIAC2PJO.|.ICDNQSDGSBPIN2C3.AQOBDJACYSHQAODQDGJBNS.|.QPNAORSOSOQARPSH3.JPBDBGYIRPOHBQHAQNAHA.|.YSQAR2SAIQJQJOHY3.PBG2SRNYOBRSQHQDCORNC.|.NISQSJBJ2BGNIBPI3.ORADSABJ2ISBARIGYO3S.|.BQYOYGNJRGOPOQRYD3.AH2AYSDSASAHYAONJYOG.|.ISJHJDPHP3Y2N2GOP3.R2IYCB2RAJOHJNO2SOR.|.QBISRSDHORNJDNY2SN3.DNCNHQ2IBYDSBIJBJQJ.|.PNOJGJ2DS3ROI2GJBQ3.D2RANQROHSJ2QNJRQO.|.RCJBCAGDNOSQCGDSACQ3.CRSCNSCJYOCBIBAB2R.|.QOQOYQCOSDNIBRIJQPC3.BPJNRSCOIJQIRBA2YP.|.2QHYCSNSI2AIB2SGRJP3.IAGJ2IPQ2IJSGA2COS.|.YNQOYJNSYANBODC2NY3.JCNYB3JPCNPGYBCPCY.|.OHDQSGR2J2BICHGSCIC3.OPCRBDJCYSYCQIOQGS.|42.|42.",
    "mechanics": {
      "initialSkills": {
        "multiLaunch": 3,
        "tripleSplit": 2
      }
    },
    "difficultyScore": {
      "totalScore": 76,
      "tier": "HARD",
      "breakableCount": 1106,
      "steelOcclusionRatio": 0.9722222222222222,
      "simBreakRate20s": 0.12059222423146473,
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
    "rleGrid": "42.|42.|.AYHBIJCIS2IGOPJB2SN2OSIQDSQ2SNAQBOYQDPHJ.|.BI2CBCORSNAPGQIQPNAI.PYAODGCOCBSBQYQNBRO.|.GIRSNO2SYBONPOGOPD5.DHPYSPJBAYAYAPIQB.|.ROGRDCYNPIBASAJCNI5.BIBNIRJPY2SCDRAGS.|.2AJYANPSIQASPGPIG7.AGSCQDAYOPISONQG.|.YBIJ2SISHRBYJHSN2D5.YINRSNSRPIHPHJRDY.|.J2ONOHIARAODAQRYCS5.DN2CQRJQHAPNDBNJS.|.PRBNBHCSHBNRJQ3.GIO.DYQISRQCOJQGAGQCPAS.|.NCOPSRSHRNQANR3.YHBYQ2HCIJONCYDQPSDQ2OB.|.QON2SRYJORY3S3.DHDCH2QCOSINIYQHQIGCAPA.|.GPQD2NAPDYSNHPA3.RIRGBHSYSY2JRBYAJSRIAI.|.SOGOQNRNRNJHRCD3.HNHQPRPAO2ANGCABOPOIDA.|.CYCY2RDSJCGOGYN3.2RJDAQGIPGQS2JPHQPCAGH.|.AHQ2Y2PH2PIRN2RN3.NJYOARBNCNAI2AQ2HODCD.|.CDSORCNOYDGPYOAC3.RJGPDGJOCHS2NOCJBYDAB.|.HBHRH2CRNACDS2H3.IQGI2GAPRJORBAPC2DHAID.|.YARCHJRGDAPQRQY3.CBDISNP2HIHSDSIRAQBCGH.|.CIDYOHJCYPCPGHN3.BAGBYOPNGQNSJRISYPHQRS.|.J2RYBYD2HIC3B3.YIYQ2NQ2YSODQP2ABIBNHRS.|.DQOQDGJHCGNHJGO3.O2PG2ONY2ODHSODQSJSDIA.|.QBRJ2RSBQRJGYDG3.CRINDYCRCO2BDRJIAC2PJO.|.ICDNQSDGSBPIN2C3.AQOBDJACYNHQAODQDGJBNS.|.QPNAORSOSOQARPSH3.JPBDBGYIRPOHBQHAQNAHA.|.YSQARSJAIQJQJOHY3.PBGSDRNYOB2RQHQDCORNC.|.NISQSJBJ2BGNIBPI3.ORADSABJ2ISBARIGYOICY.|.BQYOYGNJRGOPOQRYD3.AH2AYPDSASAHYAONJYOG.|.ISJHJDPHP3Y2N2GOP3.R2IYCB2RAJOHJNOISOR.|.QBISRSDHORNJDNYASN3.DNCNHQ2IBYDRBIJBJQJ.|.PNOJGJ2DS3ROI2GJBQ3.D2RANQROHSJ2QNJRQO.|.RCJBCAGDNOSQCGDHACQ3.CRSCNSCJYOCBIBAB2R.|.QOQOYQCOSDNIBRIJQPC3.BPJNRJCOIJQIRBA2YP.|.2QHYCSNSI2AIB2SGRJP3.IAGJ2IPQ2IJRGA2COJ.|.YNQOYJNSYANBODC2NY3.JCNYB3JPCNPGYBCPCY.|.OHDQPGR2J2BICHGSCIC3.OPCRBDJCYSYCQIOQGN.|42.|42.",
    "mechanics": {
      "initialSkills": {
        "multiLaunch": 3,
        "tripleSplit": 2
      }
    },
    "difficultyScore": {
      "totalScore": 77,
      "tier": "HARD",
      "breakableCount": 1154,
      "steelOcclusionRatio": 0.9791666666666666,
      "simBreakRate20s": 0.10431109185441942,
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
      }
    },
    "rleGrid": "42S|S13.14R13.S|S13.14R13.S|S13.14R13.S|S13.14R13.S|S13.14R13.S|S13.14R13.S|S13.14R13.S|S13.14R13.S|S13.14R13.S|S13.14R13.S|S13.14R13.S|S13.14R13.S|S40RS|S40RS|S40RS|S40RS|S40RS|S40RS|S40RS|S40RS|S40RS|S40RS|S40RS|S40RS|S40RS|S13.14R13.S|S13.14R13.S|S13.14R13.S|S13.14R13.S|S13.14R13.S|S13.14R13.S|S13.14R13.S|S13.14R13.S|S13.14R13.S|S13.14R13.S|S13.14R13.S|18S7R17S",
    "mechanics": {
      "initialSkills": {
        "multiLaunch": 3,
        "tripleSplit": 2
      }
    },
    "difficultyScore": {
      "totalScore": 79,
      "tier": "HARD",
      "breakableCount": 849,
      "steelOcclusionRatio": 0.2684563758389262,
      "simBreakRate20s": 0.023704358068315667,
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
      },
      "A": {
        "symbol": "A",
        "role": "NORMAL",
        "hp": 2,
        "color": "#ff7b54"
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
        "color": "#ef1d1d"
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
    "rleGrid": "42.|42.|.SAHIOYBSRCGBIGDHDACBGCJ2SONPS2ARSDQPJHRB.|.DJISOGS2RPJDCSASOCJO.SB2NSQBGOHRCGCO2NYI.|.SQBONPOSJC2PY3SNH5.JODGHPJRPIQJACSRS.|.RDACBHIGJASQPGSJQG5.CHSQPINI3SDCIRIB.|.2SOBHIDSDAHQASYRS7.GSNHGBQBCHRBAPNR.|.QJSA2DGJCNIHGSDPIO5.NJSNDPAORPYPIBGJB.|.GHSANPJNSNSIDGIGQJ5.PASQNCPSO2JNRBJNS.|.BPACHJRCNYPCQYBQSASY.PR3.P4SYSBQYSAIO.|.D2SC2BGSJDJISQPOQ2SGRBP3.SNPSGJGNSRHCIP.|.SHBSGDPSAJHBDOBSPORJNBCD3.SCQHSQCJAN2CS.|.PSBJYPSOI2BQSNDAQSAQGCG3.OPCSDSBQJIPGRS.|.BA5S2YARJSISCGHIORQ3.2RJDS2NOYSINSJC.|.ISAYBDBOYSASBIC2PYGJGJ3.2NSYDSDIPSRCO2S.|.C2IJSBC2SNCIGRN2GSACY3.SDQAQAR2SQB2NPAS.|.QO2CGQCNYGJPSRIGNI2BGB3.Y2DHAPRDCBACHYS.|.O2PO2DPCRSJIBJSQISINC3.GSYS2NDSR2IJSDON.|.DYDCJIRD3BPSA2SISCN3.YJIBPDYD2SHSNOSYB.|.SRS2ARSBOYBSNRP2JBP3.SP2IQJCARAIHQCSJSJ.|.HQDCBPOYCYBSBNSIAIO3.Y2SHQJBARDBSC2YGCG.|.2PGSQJAQS2JCHJSDAIYQ3.JIRY2OSQCAYRCGBND.|.DPR2GI2SDJA2SHSQASB3.B2SJASYRHIOSRJDCRI.|.SJHSBQ2BHSQRSIASCHRB3.ASHBPSJ2SN2SNGYRQ.|.NQJCSJSPDACYHGPJSDS3.RSHDPS.2SPHCSNOHNS.|.2SIGONDSGAQ2GJNS.S3.BGNYSHQSHANSYSI2SPS.|.JQAIAGHJGHSBADSYSP3.OPJPIYGS3CJRSPABJP.|.YHDQYBOGDHPJI2S2DBJ3.RIAJSIDCGCPJO2SBSI.|.NYNSAYCQRDHQ2SYDB2S3.SONYQ2SJCQPOBSOJPH.|.SAQGY2RC2S2ANSPGYSY3.SHJOHBJSYDBIYISYOJ.|.RICOSHSOQNPD2RBSDS3.IBQNQBJHOSHABSHAYOG.|.RSBCYDABH2S2IHGSNR3.NAJCODSBCSR3HCD2IN.|.CPSIHRBRPQOBYSNCJRN3.R2SGIA3QCO2NPS2PA.|.D2BIY2JBPHOYSYNRHIAD3.N2RQJICGHARPSCYJD.|.DQCQHQRASOQI2YPCIBG3.DOHBSIDGROSJNDQBJS.|.CBSGC3HSJNDNJP2NIA3.PSBNDG2SYD2CBSNSGO.|42.|42.",
    "mechanics": {
      "initialSkills": {
        "multiLaunch": 3,
        "tripleSplit": 2
      }
    },
    "difficultyScore": {
      "totalScore": 82,
      "tier": "EXPERT",
      "breakableCount": 1017,
      "steelOcclusionRatio": 0.9653679653679653,
      "simBreakRate20s": 0.10041789577187807,
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
    "rleGrid": "42.|42.|.AHAOHIRCDGSO3JYBCP2JSCHBASB2SOAYSIOGN2S.|.CSAPCSH2SRBC2AIQSAOP.2SHJNIBQAOSDAIY2GSJ.|.SQYP2SYH3SOYH2AOJ5.SHOSGDOSHJSNDRIDO.|.2SGICHR2HPN2J2SIHY5.NSOYIPSYRPHJOJNAR.|.D2SGSYSCGYIQBISOS7.DOAIY2RG2BGAPDQO.|.OSBSNDJNSGRPJ2QBIS5.RABCJSGSDCSCYSBSB.|.IDRAIJ2PDGCOSIACAN5.SQHSQGNCSYNG2SORS.|.SGQSYPYJDNSJR2ADJS3.ISB3SQHNJYNDSYNJHN.|.SPIBDQPADYH2S2CDB2Q3.PB5SASIQS2QSCPN.|.BRBAGCRCRPDQDYPBAG3.ICYGBQIOSPDQYDCHOJP.|.SGYSICGJASOS2O2C2B3.PYIRAGB3SPO3IDSPS.|.SYN2SPCPGSQYCJOGSPO3.SARONRBYRQOJDRSHRB.|.ARAG2YABRIOASGBSCO3.GQHCYODJSNHSONDYRSP.|.SDYIR2SNIJDGNRYGDGO3.NCOJISOSQROHN2JANO.|.DGYASHPQSIDNPQCADI3.2SDJ2YSIHICSCPRBGBI.|.OGOGQASPGADNDAOIC3.A2IOPNQSPHSYSBPDJ2SP.|.GBJSG2SGCDBJCI2YB3.YISN2SJSYGIHCS2RDA2G.|.HIYOSQ2PGYOBDRHGPD3.OC2BYHCSI2HGQGIRHOH.|.SYNPSRG2SYHSORHQJ3.DAQCOJSYSYHOYJBIQRQP.|.A2SYCQRIHCDSGOGYBC3.2JOCROQOSASDQ2SHAHR.|.NAGDPHDHSAQNHDGQDYG3.YIPDGJNJASDRGBAJHS.|.QAR2ICASAQI2CBPSIQO3.B2SIJCB3G2IABAIOR.|.HSC2GACRY2DRCPNQIYR3.YS2AP2SRDSBSRSIOYS.|.NAQNSBGIQDHYSRSAPBOI3.APYOGQ2BAPDJCPIBI.|.R2DY2SAGHBCBPISYORAI3.IASPNYJGHYIGJOPJA.|.ISHIDHCSNARSYQSJSBHO3.JQPYSPQDBANACBNOI.|.2GOCBSRYA2SJSQYDCYI3.BSCAP2SAGSRQY2SNRA.|.QOPHBSQRYIBJAHPDHQB3.JCYNC2BR2BRYPBSRID.|.SNJCSR2SONYGAJCOYDJ3.DC2BDBYQHYSCYDBRGH.|.SHGHQNSQSOISODPRQPGY3.OCSGJSCPSABDSHSND.|.2NOYBGRHSHJNPSIO2S2Y3.QYIGJ2SYNQNSIDPRS.|.GSRDIDCGBNP2QINCSYD3.INDPOPYAHNCHSASGJS.|.2NSN2PS2BSOCSDYSOGQ3.C3SRHNJYHIHDCBPRB.|.ASISCJN2SAS2OYIJCGI3.O2SGDRDBPOPBCJIRJR.|42.|42.",
    "mechanics": {
      "initialSkills": {
        "multiLaunch": 3,
        "tripleSplit": 2
      }
    },
    "difficultyScore": {
      "totalScore": 85,
      "tier": "EXPERT",
      "breakableCount": 1031,
      "steelOcclusionRatio": 0.9590909090909091,
      "simBreakRate20s": 0.07856450048496605,
      "hasDeadZoneWarning": false
    }
  }
];
