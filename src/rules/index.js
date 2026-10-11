import N8N001 from "./N8N001.js";
import N8N002 from "./N8N002.js";
import N8N003 from "./N8N003.js";
import N8N004 from "./N8N004.js";
import N8N005 from "./N8N005.js";
import N8N010 from "./N8N010.js";
import N8N011 from "./N8N011.js";
import N8N012 from "./N8N012.js";
import N8N013 from "./N8N013.js";
import N8N014 from "./N8N014.js";
import N8N015 from "./N8N015.js";
import N8N016 from "./N8N016.js";
import N8N017 from "./N8N017.js";
import N8N018 from "./N8N018.js";
import N8N019 from "./N8N019.js";
import N8N020 from "./N8N020.js";
import N8N021 from "./N8N021.js";
import N8N022 from "./N8N022.js";
import N8N023 from "./N8N023.js";

export const RULES = [
  N8N001,
  N8N002,
  N8N003,
  N8N004,
  N8N005,
  N8N010,
  N8N011,
  N8N012,
  N8N013,
  N8N014,
  N8N015,
  N8N016,
  N8N017,
  N8N018,
  N8N019,
  N8N020,
  N8N021,
  N8N022,
  N8N023,
];

export const CATEGORY = (id) =>
  id < "N8N010" ? "Security" : id < "N8N020" ? "Reliability" : "AI cost";
