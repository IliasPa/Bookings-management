const APT_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444"];

export function getCleaningRates() {
  try {
    const r = JSON.parse(localStorage.getItem("cleaning_rates") || "{}");
    return {
      fullClean: r.fullClean ?? 60,
      beddingChange: r.beddingChange ?? 60,
      beddingInterval: r.beddingInterval ?? 4,
    };
  } catch {
    return { fullClean: 60, beddingChange: 60, beddingInterval: 4 };
  }
}

export function saveCleaningRates(rates) {
  localStorage.setItem("cleaning_rates", JSON.stringify(rates));
}

function isWeekend(date) {
  const d = date.getDay();
  return d === 0 || d === 6;
}

function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d;
}

function parseDateStr(s) {
  const [y, m, day] = s.split("-");
  return new Date(Number(y), Number(m) - 1, Number(day));
}

export function fmtCleanShort(d) {
  return new Date(d).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function getSuggestion(checkOutStr, nextCheckInStr, backToBack) {
  const checkOut = parseDateStr(checkOutStr);
  if (backToBack) {
    return {
      type: isWeekend(checkOut) ? "preferred" : "compromise",
      date: checkOut,
      timeKey: "window",
      label: `${fmtCleanShort(checkOut)} · 11:00–15:00${isWeekend(checkOut) ? " (weekend)" : " (weekday – tight)"}`,
      note: "Back-to-back: must clean in 4-hour window",
    };
  }
  const limit = nextCheckInStr
    ? parseDateStr(nextCheckInStr)
    : addDays(checkOutStr, 7);
  let d = new Date(checkOut);
  while (d < limit) {
    if (isWeekend(d)) {
      return {
        type: "preferred",
        date: new Date(d),
        timeKey: "evening",
        label: `${fmtCleanShort(d)} · evening`,
        note: "Weekend slot available",
      };
    }
    d.setDate(d.getDate() + 1);
  }
  return {
    type: isWeekend(checkOut) ? "preferred" : "flexible",
    date: checkOut,
    timeKey: "evening",
    label: `${fmtCleanShort(checkOut)} · evening`,
    note: isWeekend(checkOut)
      ? "Checkout day is weekend"
      : "Weekday – prefer evening",
  };
}

// First booking of an apartment (no previous guest): prepare before arrival.
// Suggest the day *before* check-in — never the arrival day itself.
function getFirstSuggestion(checkInStr) {
  const dayBefore = addDays(checkInStr, -1);
  const weekend = isWeekend(dayBefore);
  return {
    type: weekend ? "preferred" : "flexible",
    date: dayBefore,
    timeKey: "evening",
    label: `${fmtCleanShort(dayBefore)} · evening`,
    note: weekend ? "Weekend slot before arrival" : "Prepare the day before arrival",
  };
}

// Greek text for the cleaner — no prices, no check-in/out or night counts.
// Each line: Date · Time — Apartment · Job (compromise jobs get a warning flag).
function fmtGreekDate(d) {
  return new Date(d).toLocaleDateString("el-GR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

const GR_TIME = {
  evening: "απόγευμα",
  anytime: "οποτεδήποτε",
  before: "οποτεδήποτε (πριν την άφιξη)",
  window: "11:00–15:00",
};

function scheduleFieldsGr(e) {
  const s = e.suggestion;
  return {
    date: fmtGreekDate(s.date),
    time: GR_TIME[s.timeKey] || GR_TIME.evening,
    job: e.type === "bedding" ? "Αλλαγή σεντονιών" : "Πλήρης καθαρισμός",
    compromise: s.type === "compromise", // tight weekday same-day changeover
  };
}

// Build the cleaner's schedule as plain Greek text.
// events: already-filtered list (e.g. upcoming, hidden jobs removed).
export function formatCleaningSchedule(
  events,
  { showAll = false, today = new Date() } = {},
) {
  const header = showAll
    ? "Πρόγραμμα καθαρισμού"
    : `Πρόγραμμα καθαρισμού (από ${fmtGreekDate(today)})`;

  if (!events.length) return `${header}\n(καμία εργασία)`;

  const lines = events.map((e) => {
    const { date, time, job, compromise } = scheduleFieldsGr(e);
    return `• ${date} · ${time} — ${e.aptName} · ${job}${compromise ? " ⚠" : ""}`;
  });

  const hasCompromise = events.some((e) => e.suggestion.type === "compromise");
  const legend = hasCompromise
    ? "\n\n⚠ συμβιβασμός = ίδια μέρα check-out/check-in, καθάρισμα υποχρεωτικά 11:00–15:00"
    : "";

  return `${header}\n${lines.join("\n")}${legend}`;
}

export function computeCleaningEvents(bookings, apartments, rates = {}) {
  const { fullClean = 60, beddingChange = 60, beddingInterval = 4 } = rates;
  const events = [];

  apartments.forEach((apt, aptIdx) => {
    const aptBookings = bookings
      .filter((b) => b.apartment === apt.id)
      .sort((a, b) => a.checkIn.localeCompare(b.checkIn));

    aptBookings.forEach((booking, idx) => {
      const prevBooking = aptBookings[idx - 1];
      const backToBack =
        !!prevBooking && prevBooking.checkOut === booking.checkIn;
      const cleanDate = prevBooking
        ? parseDateStr(prevBooking.checkOut)
        : parseDateStr(booking.checkIn);

      const suggestion = prevBooking
        ? getSuggestion(prevBooking.checkOut, booking.checkIn, backToBack)
        : getFirstSuggestion(booking.checkIn);

      const fullFlexWindow = !prevBooking
        ? "Anytime before check-in day"
        : backToBack
          ? "Same-day changeover — clean within 11:00–15:00"
          : "Anytime between previous check-out & check-in";

      events.push({
        id: `clean_${booking.id}`,
        aptId: apt.id,
        aptName: apt.name,
        aptColor: APT_COLORS[aptIdx % APT_COLORS.length],
        type: "full",
        sortDate: cleanDate,
        // Not "past" until the guest it prepares for has actually checked in.
        refDate: parseDateStr(booking.checkIn),
        stay: {
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          nights: booking.nights,
        },
        backToBack,
        suggestion,
        cost: fullClean,
        label: "Full Clean",
        flexWindow: fullFlexWindow,
        detail: prevBooking
          ? `After ${fmtCleanShort(prevBooking.checkOut)} checkout · for ${fmtCleanShort(booking.checkIn)} check-in`
          : `Before ${fmtCleanShort(booking.checkIn)} check-in`,
      });

      // Bedding changes during the stay — skip if only 1 night would remain after the change
      if (booking.nights > beddingInterval) {
        for (
          let day = beddingInterval;
          day < booking.nights;
          day += beddingInterval
        ) {
          const remainingNights = booking.nights - day;
          if (remainingNights <= 1) break;
          const changeDate = addDays(booking.checkIn, day);
          if (changeDate >= parseDateStr(booking.checkOut)) break;
          const weekend = isWeekend(changeDate);
          events.push({
            id: `bedding_${booking.id}_d${day}`,
            aptId: apt.id,
            aptName: apt.name,
            aptColor: APT_COLORS[aptIdx % APT_COLORS.length],
            type: "bedding",
            sortDate: changeDate,
            refDate: changeDate,
            changeDate: changeDate.toISOString().split("T")[0],
            stay: {
              checkIn: booking.checkIn,
              checkOut: booking.checkOut,
              nights: booking.nights,
            },
            suggestion: {
              type: weekend ? "preferred" : "flexible",
              date: changeDate,
              timeKey: weekend ? "anytime" : "evening",
              label: `${fmtCleanShort(changeDate)} · ${weekend ? "anytime" : "evening"}`,
              note: weekend
                ? "Weekend – flexible timing"
                : "Weekday – prefer evening",
            },
            cost: beddingChange,
            label: `Bedding Change (night ${day})`,
            flexWindow: weekend
              ? "Anytime during the day"
              : "Evening preferred (guests in residence)",
            detail: `Stay ${fmtCleanShort(booking.checkIn)} → ${fmtCleanShort(booking.checkOut)} · ${booking.nights} nights`,
          });
        }
      }
    });
  });

  return events.sort((a, b) => a.sortDate - b.sortDate);
}
