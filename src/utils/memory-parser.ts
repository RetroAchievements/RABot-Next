export interface ParsedRequirement {
  flag: string;
  lType: string;
  lSize: string;
  lMemory: string;
  cmp: string;
  rType: string;
  rSize: string;
  rMemVal: string;
  hits: string;
}

export interface MemoryParserResult {
  groups: ParsedRequirement[][];
  addresses: string[];
}

const MAX_CHARS = 6;

const SPECIAL_FLAGS: Record<string, string> = {
  r: "ResetIf",
  p: "Pause If",
  a: "AddSource",
  b: "SubSource",
  c: "AddHits",
  i: "AddAddress",
  m: "Measured",
  n: "AndNext",
  o: "OrNext",
  q: "MeasuredIf",
  z: "ResetNextIf",
  d: "SubHits",
  t: "Trigger",
  k: "Remember",
  g: "Measured%",
  "": "",
};

const MEM_SIZE: Record<string, string> = {
  "0xk": "BitCount",
  "0xm": "Bit0",
  "0xn": "Bit1",
  "0xo": "Bit2",
  "0xp": "Bit3",
  "0xq": "Bit4",
  "0xr": "Bit5",
  "0xs": "Bit6",
  "0xt": "Bit7",
  "0xl": "Lower4",
  "0xu": "Upper4",
  "0xh": "8-bit",
  "0xw": "24-bit",
  "0xx": "32-bit",
  "0xi": "16-bit BE",
  "0xj": "24-bit BE",
  "0xg": "32-bit BE",
  "0x ": "16-bit",
  "0x": "16-bit",
  ff: "Float",
  fb: "Float BE",
  fh: "Double32",
  fi: "Double32 BE",
  fm: "MBF32",
  fl: "MBF32 LE",
  h: "",
  "": "",
};

const MEM_TYPES: Record<string, string> = {
  d: "Delta",
  p: "Prior",
  m: "Mem",
  v: "Value",
  b: "BCD",
  "~": "Inverted",
  f: "Float",
  recall: "Recall",
  variable: "Variable",
  "": "",
};

export function parseMemory(mem: string): MemoryParserResult {
  const addresses: string[] = [];

  // Split by S but not when preceded by 0x
  const groups = mem.split(/(?<!0x)S/);
  const parsedGroups: ParsedRequirement[][] = [];

  for (const group of groups) {
    const requirements = group.split("_");
    const parsedRequirements: ParsedRequirement[] = [];

    for (const req of requirements) {
      if (!req) continue; // Skip empty requirements

      const parsed = parseRequirement(req);
      if (!parsed) {
        throw new Error(`Invalid "Mem" string. Failed to parse: ${req}`);
      }

      parsedRequirements.push(parsed);

      // Collect addresses
      if (parsed.lType !== "v" && parsed.lMemory && !addresses.includes(parsed.lMemory)) {
        addresses.push(parsed.lMemory);
      }
      if (parsed.rType !== "v" && parsed.rMemVal && !addresses.includes(parsed.rMemVal)) {
        addresses.push(parsed.rMemVal);
      }
    }

    // If group is empty, add a default "0=0" requirement
    if (parsedRequirements.length === 0) {
      parsedRequirements.push({
        flag: "",
        lType: "v",
        lSize: "",
        lMemory: "",
        cmp: "=",
        rType: "v",
        rSize: "",
        rMemVal: "",
        hits: "0",
      });
    }

    parsedGroups.push(parsedRequirements);
  }

  return { groups: parsedGroups, addresses };
}

function parseRecallRequirement(req: string): ParsedRequirement | null {
  // Parse expressions containing {recall}
  // Examples: "K:{recall}+2", "K:{recall}", "I:0xG0045ba18+{recall}", etc.
  const specialFlags = Object.keys(SPECIAL_FLAGS).join("");

  // Try left-side {recall} first: "K:{recall}+2"
  const leftRecallRegex = new RegExp(
    `^(?:([${specialFlags}]):)?\\{recall\\}(<=|>=|<|>|==|=|!=|\\*|\\/|&|\\+|\\-|\\^|%)?(.*)(?:[(.](\\w+)[).])?$`,
    "i",
  );

  // Try right-side {recall}: "I:0xG0045ba18+{recall}"
  const rightRecallRegex = new RegExp(
    `^(?:([${specialFlags}]):)?(.*?)(<=|>=|<|>|==|=|!=|\\*|\\/|&|\\+|\\-|\\^|%)\\{recall\\}(?:[(.](\\w+)[).])?$`,
    "i",
  );

  // Try left-side {recall} first
  let match = req.match(leftRecallRegex);
  if (match) {
    const flag = (match[1] || "").toLowerCase();
    const cmp = match[2] || "";
    const rightOperand = match[3] || "";
    const hits = match[4] || (flag === "k" ? "" : "0"); // Remember flag usually has no hits

    let rType = "";
    let rSize = "";
    let rMemVal = "";

    if (rightOperand) {
      // Parse the right operand using existing logic
      const operandRegex = `(d|p|b)?(0xk|0xm|0xn|0xo|0xp|0xq|0xr|0xs|0xt|0xl|0xu|0xh|0xw|0xx|0xi|0xj|0xg|0x |0x|h)?([0-9a-z+-]*)`;
      const operandMatch = rightOperand.match(new RegExp(`^${operandRegex}$`, "i"));
      if (operandMatch) {
        rType = operandMatch[1] || "";
        rSize = operandMatch[2] || "";
        rMemVal = operandMatch[3] || "";

        // Convert to lowercase
        rType = rType.toLowerCase();
        rSize = rSize.toLowerCase();

        // Handle type determination for right operand
        if (rType !== "d" && rType !== "p" && rType !== "b" && rType !== "v") {
          rType = rSize !== "" ? "m" : "v";
        }

        // Format memory values
        if (rSize === "" && rMemVal && !["n", "t", "true", "false", "lvlintro"].includes(rMemVal)) {
          const num = parseInt(rMemVal, 10);
          if (!Number.isNaN(num)) {
            rMemVal = num.toString(16);
          }
        }

        if (rMemVal && rMemVal.startsWith("0x")) {
          rMemVal = rMemVal.substring(2);
        }
        if (rMemVal && !["n", "t", "true", "false", "lvlintro"].includes(rMemVal)) {
          rMemVal = `0x${rMemVal.padStart(MAX_CHARS, "0")}`;
        }
      }
    }

    return {
      flag,
      lType: "recall",
      lSize: "",
      lMemory: "",
      cmp,
      rType,
      rSize,
      rMemVal,
      hits,
    };
  }

  // Try right-side {recall}
  match = req.match(rightRecallRegex);
  if (match) {
    const flag = (match[1] || "").toLowerCase();
    const leftOperand = match[2] || "";
    const cmp = match[3] || "";
    const hits = match[4] || (flag === "k" ? "" : "0");

    let lType = "";
    let lSize = "";
    let lMemory = "";

    if (leftOperand) {
      // Parse the left operand using existing logic
      const operandRegex = `(d|p|b)?(0xk|0xm|0xn|0xo|0xp|0xq|0xr|0xs|0xt|0xl|0xu|0xh|0xw|0xx|0xi|0xj|0xg|0x |0x|h)?([0-9a-z+-]*)`;
      const operandMatch = leftOperand.match(new RegExp(`^${operandRegex}$`, "i"));
      if (operandMatch) {
        lType = operandMatch[1] || "";
        lSize = operandMatch[2] || "";
        lMemory = operandMatch[3] || "";

        // Convert to lowercase
        lType = lType.toLowerCase();
        lSize = lSize.toLowerCase();

        // Handle type determination for left operand
        if (lType !== "d" && lType !== "p" && lType !== "b" && lType !== "v") {
          lType = lSize !== "" ? "m" : "v";
        }

        // Format memory addresses
        if (lSize === "" && lMemory && !["n", "t", "true", "false", "lvlintro"].includes(lMemory)) {
          const num = parseInt(lMemory, 10);
          if (!Number.isNaN(num)) {
            lMemory = num.toString(16);
          }
        }

        if (lMemory && lMemory.startsWith("0x")) {
          lMemory = lMemory.substring(2);
        }
        if (lMemory && !["n", "t", "true", "false", "lvlintro"].includes(lMemory)) {
          lMemory = `0x${lMemory.padStart(MAX_CHARS, "0")}`;
        }
      }
    }

    return {
      flag,
      lType,
      lSize,
      lMemory,
      cmp,
      rType: "recall",
      rSize: "",
      rMemVal: "",
      hits,
    };
  }

  return null;
}

function parseVariableRequirement(req: string): ParsedRequirement | null {
  // Parse expressions containing {variableName}
  // Examples: "K:{varname}+2", "A:{varname}", etc.
  const specialFlags = Object.keys(SPECIAL_FLAGS).join("");

  // Try variable expression: "K:{varname}+2"
  const variableRegex = new RegExp(
    `^(?:([${specialFlags}]):)?\\{([^}]+)\\}(<=|>=|<|>|==|=|!=|\\*|\\/|&|\\+|\\-|\\^|%)?(.*)(?:[(.](\\w+)[).])?$`,
    "i",
  );

  const match = req.match(variableRegex);
  if (match) {
    const flag = (match[1] || "").toLowerCase();
    const variableName = match[2] || "";
    const cmp = match[3] || "";
    const rightOperand = match[4] || "";
    const hits = match[5] || (flag === "k" ? "" : "0");

    let rType = "";
    let rSize = "";
    let rMemVal = "";

    if (rightOperand) {
      // Parse the right operand using existing logic
      const operandRegex = `(d|p|b|~|v|f)?(f[fbihlm]|0xk|0xm|0xn|0xo|0xp|0xq|0xr|0xs|0xt|0xl|0xu|0xh|0xw|0xx|0xi|0xj|0xg|0x |0x|h)?([0-9a-z+.-]*)`;
      const operandMatch = rightOperand.match(new RegExp(`^${operandRegex}$`, "i"));
      if (operandMatch) {
        rType = (operandMatch[1] || "").toLowerCase();
        rSize = (operandMatch[2] || "").toLowerCase();
        rMemVal = operandMatch[3] || "";

        // Handle type determination for right operand
        if (
          rType !== "d" &&
          rType !== "p" &&
          rType !== "b" &&
          rType !== "v" &&
          rType !== "~" &&
          rType !== "f"
        ) {
          // Special check for float literals
          if (rSize === "f" && rMemVal && rMemVal.includes(".")) {
            rType = "f";
            rSize = "";
          } else {
            rType = rSize !== "" ? "m" : "v";
          }
        }

        // Format memory values
        if (
          rSize === "" &&
          rMemVal &&
          !["n", "t", "true", "false", "lvlintro"].includes(rMemVal) &&
          !rMemVal.includes(".")
        ) {
          const num = parseInt(rMemVal, 10);
          if (!Number.isNaN(num)) {
            rMemVal = num.toString(16);
          }
        }

        if (rMemVal && rMemVal.startsWith("0x")) {
          rMemVal = rMemVal.substring(2);
        }
        if (
          rMemVal &&
          !["n", "t", "true", "false", "lvlintro"].includes(rMemVal) &&
          !rMemVal.includes(".")
        ) {
          rMemVal = `0x${rMemVal.padStart(MAX_CHARS, "0")}`;
        }
      }
    }

    return {
      flag,
      lType: "variable",
      lSize: "",
      lMemory: variableName,
      cmp,
      rType,
      rSize,
      rMemVal,
      hits,
    };
  }

  return null;
}

function parseRequirement(req: string): ParsedRequirement | null {
  // Handle special case for {recall} expressions first
  if (req.includes("{recall}")) {
    return parseRecallRequirement(req);
  }

  // Handle {variable} expressions
  if (req.includes("{") && req.includes("}")) {
    return parseVariableRequirement(req);
  }

  // Handle incomplete curly braces as invalid
  if (req.includes("{") || req.includes("}")) {
    return null;
  }

  // More permissive regex that handles all operand types
  // Note: order matters! f[fbihlm] must come before single f to match float sizes
  // Note: dots are handled separately for hits parsing
  // Handle invalid characters early - but allow valid operators
  // Don't reject based on characters since we have complex operators

  const operandRegex = `(d|p|b|~|v|f)?(f[fbihlm]|0xk|0xm|0xn|0xo|0xp|0xq|0xr|0xs|0xt|0xl|0xu|0xh|0xw|0xx|0xi|0xj|0xg|0x |0x|h)?([0-9a-z+\\-]*(?:\\.[0-9a-z]*)?)`;
  const specialFlags = Object.keys(SPECIAL_FLAGS).join("");
  const memRegex = new RegExp(
    `^(?:([${specialFlags}]):)?${operandRegex}(<=|>=|<|>|==|=|!=|\\*|\\/|&|\\+|\\-|\\^|%)?${operandRegex}(?:[\\.(](\\w+)[\\.)\\]])?$`,
    "i",
  );
  const match = req.match(memRegex);
  if (!match) {
    return null;
  }
  let flag = match[1] || "";
  let lType = match[2] || "";
  let lSize = match[3] || "";
  let lMemory = match[4] || "";
  let cmp = match[5] || "=";

  // Normalize == to =
  if (cmp === "==") {
    cmp = "=";
  }
  let rType = match[6] || "";
  let rSize = match[7] || "";
  let rMemVal = match[8] || "";

  // Parse hits first before determining scalable flag behavior
  let hits = match[9] || "0";

  // Scalable flags (Remember, AddSource, SubSource, AddAddress) handle operators differently
  const scalableFlags = ["k", "a", "b", "i"];
  const isScalableFlag = scalableFlags.includes(flag.toLowerCase());
  const scalarOperators = ["*", "/", "&", "+", "-", "^", "%"];
  const isScalarOperator = scalarOperators.includes(cmp);

  if (isScalableFlag) {
    hits = "";

    // Scalable flags with comparison operators keep the parsed values
    // but the formatting logic will ignore them
    if (!isScalarOperator && cmp) {
      // Keep the parsed values for now
    }
  }

  // Handle special parsing for float literals (f123.4, f-5.432)
  // Left side float: if we have 'f' type and a numeric value in memory field
  if (lType === "f" && lSize === "" && lMemory.match(/^[+-]?\d*\.?\d+$/)) {
    // This is a float literal like f123.4
    return {
      flag: flag.toLowerCase(),
      lType: "f",
      lSize: "",
      lMemory,
      cmp,
      rType: rType.toLowerCase(),
      rSize: rSize.toLowerCase(),
      rMemVal,
      hits,
    };
  }

  // Right side float: check if we parsed 'f' in the operand regex
  if (rType === "f" && rSize === "" && rMemVal.match(/^[+-]?\d*\.?\d+$/)) {
    // Right side is a float literal
    return {
      flag: flag.toLowerCase(),
      lType: lType.toLowerCase(),
      lSize: lSize.toLowerCase(),
      lMemory,
      cmp,
      rType: "f",
      rSize: "",
      rMemVal,
      hits,
    };
  }

  // Handle cases where the d/p/b/~/f prefix might be part of the memory address
  if (
    rType === "" &&
    rSize === "" &&
    (rMemVal.startsWith("d0x") ||
      rMemVal.startsWith("p0x") ||
      rMemVal.startsWith("b0x") ||
      rMemVal.startsWith("~0x"))
  ) {
    rType = rMemVal[0] || "";
    const rest = rMemVal.substring(1); // Remove prefix
    const sizeMatch = rest.match(/^(0x[a-z])/i);
    if (sizeMatch && sizeMatch[1]) {
      rSize = sizeMatch[1];
      rMemVal = rest.substring(sizeMatch[1].length);
    }
  }

  // Convert to lowercase first
  flag = flag.toLowerCase();
  lType = lType.toLowerCase();
  lSize = lSize.toLowerCase();
  rType = rType.toLowerCase();
  rSize = rSize.toLowerCase();

  // Handle hex values with h prefix (h1234)
  if (!lType && lSize === "h" && lMemory) {
    lType = "v";
    lSize = "";
    lMemory = `0x${lMemory.padStart(MAX_CHARS, "0")}`;
  }

  if (!rType && rSize === "h" && rMemVal) {
    rType = "v";
    rSize = "";
    rMemVal = `0x${rMemVal.padStart(MAX_CHARS, "0")}`;
  }

  // Handle special constants and format memory addresses
  const specialConstants = ["n", "t", "true", "lvlintro"];

  // Check if we're parsing an address without 0x prefix (like H1234)
  if (!lType && !lSize && lMemory && lMemory.match(/^[hH][0-9a-fA-F]+$/)) {
    // This is H1234 format
    lType = "m";
    lSize = "0xh";
    lMemory = lMemory.substring(1); // Remove H prefix
  }

  if (
    lSize === "" &&
    lMemory &&
    !specialConstants.includes(lMemory) &&
    !lMemory.includes(".") &&
    !lMemory.startsWith("0x")
  ) {
    const num = parseInt(lMemory, 10);
    if (!Number.isNaN(num) && num >= 0) {
      lMemory = num.toString(16);
    }
  }

  // Handle the address formatting - remove 0x prefix if present, then add it back
  if (lMemory && lMemory.startsWith("0x")) {
    lMemory = lMemory.substring(2);
  }
  if (lMemory && !specialConstants.includes(lMemory) && !lMemory.includes(".")) {
    lMemory = `0x${lMemory.padStart(MAX_CHARS, "0")}`;
  }

  if (
    rSize === "" &&
    rMemVal &&
    !specialConstants.includes(rMemVal) &&
    !rMemVal.includes(".") &&
    !rMemVal.startsWith("0x")
  ) {
    const num = parseInt(rMemVal, 10);
    if (!Number.isNaN(num) && num >= 0) {
      rMemVal = num.toString(16);
    }
  }

  // Handle the value formatting - remove 0x prefix if present, then add it back
  if (rMemVal && rMemVal.startsWith("0x")) {
    rMemVal = rMemVal.substring(2);
  }
  if (
    rMemVal &&
    !specialConstants.includes(rMemVal) &&
    !rMemVal.includes(".") &&
    !rMemVal.startsWith("-") // Don't format negative values
  ) {
    rMemVal = `0x${rMemVal.padStart(MAX_CHARS, "0")}`;
  }

  // Determine types
  if (
    lType !== "d" &&
    lType !== "p" &&
    lType !== "b" &&
    lType !== "v" &&
    lType !== "~" &&
    lType !== "f" &&
    lType !== "recall"
  ) {
    // Special case for float literals (size="f" and memory contains decimal point)
    if (lSize === "f" && lMemory.includes(".")) {
      lType = "f";
      lSize = "";
    } else {
      // If we have a size prefix (like 0xh, 0xm, etc), it's a memory address
      lType = lSize !== "" ? "m" : "v";
    }
  }
  if (
    rType !== "d" &&
    rType !== "p" &&
    rType !== "b" &&
    rType !== "v" &&
    rType !== "~" &&
    rType !== "f" &&
    rType !== "recall"
  ) {
    // Special case for float literals (size="f" and memory contains decimal point)
    if (rSize === "f" && rMemVal.includes(".")) {
      rType = "f";
      rSize = "";
    } else {
      // If we have a size prefix (like 0xh, 0xm, etc), it's a memory address
      rType = rSize !== "" ? "m" : "v";
    }
  }

  return {
    flag,
    lType,
    lSize,
    lMemory,
    cmp,
    rType,
    rSize,
    rMemVal,
    hits,
  };
}

export function formatParsedRequirement(req: ParsedRequirement, index: number): string {
  let result = `${(index + 1).toString().padStart(2, " ")}:`;
  result += (SPECIAL_FLAGS[req.flag] || "").padEnd(12, " ");
  result += (MEM_TYPES[req.lType] || "").padEnd(6, " ");
  result += (MEM_SIZE[req.lSize] || "").padEnd(7, " ");
  // Pad memory field to maintain alignment (typical memory addresses are 8 chars + 1 space)
  result += (req.lMemory || "").padEnd(9, " ");

  // Handle comparison display logic
  const isScalableFlag = ["a", "b", "i", "k"].includes(req.flag);

  // Show comparison for most cases, but not for scalable flags with non-scalar operators
  const isScalarOperator = ["*", "/", "&", "+", "-", "^", "%"].includes(req.cmp);
  if (!isScalableFlag || (isScalableFlag && isScalarOperator)) {
    result += req.cmp.padEnd(3, " ");
    result += (MEM_TYPES[req.rType] || "").padEnd(6, " ");
    result += (MEM_SIZE[req.rSize] || "").padEnd(7, " ");
    result += req.rMemVal.padEnd(10, " ");

    // Only show hits for non-scalable flags (scalable flags never show hits)
    if (!isScalableFlag && req.hits !== "") {
      result += `(${req.hits})`;
    }
  }

  return result;
}

export function formatMemoryGroups(groups: ParsedRequirement[][]): string {
  let result = "\n";

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    if (!group) continue;

    result += i === 0 ? "__**Core Group**__:" : `__**Alt Group ${i}**__:`;
    result += "```";

    for (let j = 0; j < group.length; j++) {
      const req = group[j];
      if (req) {
        result += "\n" + formatParsedRequirement(req, j);
      }
    }

    result += "```";
  }

  return result;
}
