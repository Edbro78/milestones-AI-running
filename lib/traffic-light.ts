import type { GarminSnapshot, TrafficLightResult, Trafikklys } from "@/lib/types";

export function computeTrafficLight(snapshot: GarminSnapshot): TrafficLightResult {
  const triggers: string[] = [];
  let red = 0;
  let green = 0;

  const { hrv, hrv_7d_avg, resting_hr, resting_hr_7d_avg, body_battery, sleep_hours, training_readiness, training_load } =
    snapshot;

  if (hrv != null && hrv_7d_avg != null) {
    if (hrv < hrv_7d_avg * 0.9) {
      red += 1;
      triggers.push(`HRV ${hrv} under 7-dagers snitt (${hrv_7d_avg})`);
    } else if (hrv > hrv_7d_avg * 1.05) {
      green += 1;
      triggers.push(`HRV ${hrv} over 7-dagers snitt (${hrv_7d_avg})`);
    }
  }

  if (resting_hr != null && resting_hr_7d_avg != null) {
    if (resting_hr > resting_hr_7d_avg + 3) {
      red += 1;
      triggers.push(`Hvilepuls ${resting_hr} forhøyet vs snitt ${resting_hr_7d_avg}`);
    } else if (resting_hr < resting_hr_7d_avg - 1) {
      green += 1;
      triggers.push(`Lav hvilepuls ${resting_hr} (snitt ${resting_hr_7d_avg})`);
    }
  }

  if (body_battery != null) {
    if (body_battery < 35) {
      red += 1;
      triggers.push(`Lav Body Battery (${body_battery})`);
    } else if (body_battery >= 70) {
      green += 1;
      triggers.push(`Høy Body Battery (${body_battery})`);
    }
  }

  if (sleep_hours != null) {
    if (sleep_hours < 6) {
      red += 1;
      triggers.push(`Kort søvn (${sleep_hours.toFixed(1)} t)`);
    } else if (sleep_hours >= 7.5) {
      green += 1;
      triggers.push(`God søvn (${sleep_hours.toFixed(1)} t)`);
    }
  }

  if (training_readiness != null) {
    if (training_readiness < 40) {
      red += 1;
      triggers.push(`Lav readiness (${training_readiness})`);
    } else if (training_readiness >= 70) {
      green += 1;
      triggers.push(`Høy readiness (${training_readiness})`);
    }
  }

  if (training_load != null && training_load > 800) {
    red += 1;
    triggers.push(`Høy akkumulert belastning (${training_load})`);
  }

  let trafikklys: Trafikklys = "gult";
  if (red >= 2 || (red >= 1 && green === 0 && (body_battery != null && body_battery < 35))) {
    trafikklys = "rødt";
  } else if (green >= 2 && red === 0) {
    trafikklys = "grønt";
  } else if (red >= 1 && green === 0) {
    trafikklys = "rødt";
  } else if (green >= 1 && red === 0) {
    trafikklys = "grønt";
  }

  if (triggers.length === 0) {
    triggers.push("Verdier innenfor vanlig variasjon – tren som normalt");
  }

  const begrunnelse =
    trafikklys === "grønt"
      ? "Gode restitusjonsmarkører – du kan trene hardere enn planlagt."
      : trafikklys === "rødt"
        ? "Tegn til høy belastning eller dårlig restitusjon – vær forsiktig."
        : "Normale verdier – hold deg til planen.";

  return { trafikklys, begrunnelse, triggers };
}
