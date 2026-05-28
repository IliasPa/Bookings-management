const APT_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

export function getCleaningRates() {
  try {
    const r = JSON.parse(localStorage.getItem('cleaning_rates') || '{}');
    return {
      fullClean: r.fullClean ?? 60,
      beddingChange: r.beddingChange ?? 60,
      beddingInterval: r.beddingInterval ?? 4,
    };
  } catch { return { fullClean: 60, beddingChange: 60, beddingInterval: 4 }; }
}

export function saveCleaningRates(rates) {
  localStorage.setItem('cleaning_rates', JSON.stringify(rates));
}

function isWeekend(date) { const d = date.getDay(); return d === 0 || d === 6; }

function addDays(dateStr, n) {
  const d = new Date(dateStr); d.setDate(d.getDate() + n); return d;
}

function parseDateStr(s) {
  const [y, m, day] = s.split('-');
  return new Date(Number(y), Number(m) - 1, Number(day));
}

export function fmtCleanShort(d) {
  return new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function getSuggestion(checkOutStr, nextCheckInStr, backToBack) {
  const checkOut = parseDateStr(checkOutStr);
  if (backToBack) {
    return {
      type: isWeekend(checkOut) ? 'preferred' : 'compromise',
      label: `${fmtCleanShort(checkOut)} · 11:00–15:00${isWeekend(checkOut) ? ' (weekend)' : ' (weekday – tight)'}`,
      note: 'Back-to-back: must clean in 4-hour window',
    };
  }
  const limit = nextCheckInStr ? parseDateStr(nextCheckInStr) : addDays(checkOutStr, 7);
  let d = new Date(checkOut);
  while (d < limit) {
    if (isWeekend(d)) {
      return { type: 'preferred', label: `${fmtCleanShort(d)} · evening`, note: 'Weekend slot available' };
    }
    d.setDate(d.getDate() + 1);
  }
  return {
    type: isWeekend(checkOut) ? 'preferred' : 'flexible',
    label: `${fmtCleanShort(checkOut)} · evening`,
    note: isWeekend(checkOut) ? 'Checkout day is weekend' : 'Weekday – prefer evening',
  };
}

export function computeCleaningEvents(bookings, apartments, rates = {}) {
  const { fullClean = 60, beddingChange = 60, beddingInterval = 4 } = rates;
  const events = [];

  apartments.forEach((apt, aptIdx) => {
    const aptBookings = bookings
      .filter(b => b.apartment === apt.id)
      .sort((a, b) => a.checkIn.localeCompare(b.checkIn));

    aptBookings.forEach((booking, idx) => {
      const prevBooking = aptBookings[idx - 1];
      const backToBack = !!prevBooking && prevBooking.checkOut === booking.checkIn;
      const cleanDate = prevBooking
        ? parseDateStr(prevBooking.checkOut)
        : parseDateStr(booking.checkIn);

      const suggestion = prevBooking
        ? getSuggestion(prevBooking.checkOut, booking.checkIn, backToBack)
        : {
            type: 'flexible',
            label: `${fmtCleanShort(booking.checkIn)} · before check-in`,
            note: 'Prepare before first guest',
          };

      events.push({
        id: `clean_${booking.id}`,
        aptId: apt.id,
        aptName: apt.name,
        aptColor: APT_COLORS[aptIdx % APT_COLORS.length],
        type: 'full',
        sortDate: cleanDate,
        backToBack,
        suggestion,
        cost: fullClean,
        label: 'Full Clean',
        detail: prevBooking
          ? `After ${fmtCleanShort(prevBooking.checkOut)} checkout · for ${fmtCleanShort(booking.checkIn)} check-in`
          : `Before ${fmtCleanShort(booking.checkIn)} check-in`,
      });

      // Bedding changes during the stay — skip if only 1 night would remain after the change
      if (booking.nights > beddingInterval) {
        for (let day = beddingInterval; day < booking.nights; day += beddingInterval) {
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
            type: 'bedding',
            sortDate: changeDate,
            changeDate: changeDate.toISOString().split('T')[0],
            suggestion: {
              type: weekend ? 'preferred' : 'flexible',
              label: `${fmtCleanShort(changeDate)} · ${weekend ? 'anytime' : 'evening'}`,
              note: weekend ? 'Weekend – flexible timing' : 'Weekday – prefer evening',
            },
            cost: beddingChange,
            label: `Bedding Change (night ${day})`,
            detail: `Stay ${fmtCleanShort(booking.checkIn)} → ${fmtCleanShort(booking.checkOut)} · ${booking.nights} nights`,
          });
        }
      }
    });
  });

  return events.sort((a, b) => a.sortDate - b.sortDate);
}
