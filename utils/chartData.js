;(function () {
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  function monthlyRevenue(bookings, year = new Date().getFullYear()) {
    const months = monthNames.map((m) => ({ month: m, Rebekka: 0, Back: 0, Total: 0 }));
    (bookings || []).forEach((b) => {
      if (!b || !b.checkIn) return;
      const d = new Date(b.checkIn + "T00:00:00");
      if (d.getFullYear() !== year) return;
      const m = d.getMonth();
      const net = parseFloat(b.net) || 0;
      months[m].Total += net;
      if (b.apt === "Rebekka") months[m].Rebekka += net;
      else if (b.apt === "Back") months[m].Back += net;
    });
    return months;
  }

  function revenueByPlatform(bookings) {
    const map = {};
    (bookings || []).forEach((b) => {
      const p = b.platform || "Unknown";
      const net = parseFloat(b.net) || 0;
      map[p] = (map[p] || 0) + net;
    });
    return Object.keys(map)
      .filter((k) => map[k] > 0)
      .map((k) => ({ name: k, value: map[k] }));
  }

  function expensesByCategory(expenses, aptFilter = "All") {
    const map = {};
    (expenses || []).forEach((e) => {
      if (aptFilter !== "All" && e.apt !== aptFilter) return;
      const cat = e.cat || "Other";
      const v = parseFloat(e.total) || 0;
      map[cat] = (map[cat] || 0) + v;
    });
    return Object.keys(map)
      .map((k) => ({ name: k, value: map[k] }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value);
  }

  function bookingsCalendar(bookings, year = new Date().getFullYear()) {
    const months = monthNames.map((label, idx) => {
      const daysInMonth = new Date(year, idx + 1, 0).getDate();
      return {
        label,
        days: Array.from({ length: 31 }, (_, i) => ({
          day: i + 1,
          status: i + 1 > daysInMonth ? "Missing" : "Available",
        })),
      };
    });
    (bookings || []).forEach((b) => {
      if (!b.checkIn || !b.checkOut) return;
      let cur = new Date(b.checkIn + "T00:00:00");
      const end = new Date(b.checkOut + "T00:00:00");
      while (cur < end) {
        if (cur.getFullYear() === year) {
          const m = cur.getMonth();
          const d = cur.getDate() - 1;
          // only mark days that actually exist in that month
          if (!months[m] || !months[m].days[d] || months[m].days[d].status === "Missing") {
            // skip
          } else {
            const prev = months[m].days[d].status;
            const apt = b.apt === "Rebekka" ? "Rebekka" : b.apt === "Back" ? "Back" : "Other";
            if (prev === "Available") months[m].days[d].status = apt;
            else if (prev !== apt && !prev.includes(apt)) months[m].days[d].status = "Both";
          }
        }
        cur.setDate(cur.getDate() + 1);
      }
    });
    return months;
  }

  function avgNightlyRateOverBookings(bookings) {
    const sorted = (bookings || []).slice().sort((a, b) => (a.checkIn || "").localeCompare(b.checkIn || ""));
    return sorted.map((b) => {
      const net = parseFloat(b.net) || 0;
      const nights = parseInt(b.nights) || (b.checkIn && b.checkOut ? Math.round((new Date(b.checkOut) - new Date(b.checkIn)) / 86400000) : 0);
      return {
        label: b.checkIn,
        Rebekka: b.apt === "Rebekka" ? (nights ? net / nights : null) : undefined,
        Back: b.apt === "Back" ? (nights ? net / nights : null) : undefined,
        apt: b.apt,
        nights,
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        netPerNight: nights ? net / nights : 0,
      };
    });
  }

  window.chartUtils = {
    monthlyRevenue,
    revenueByPlatform,
    expensesByCategory,
    bookingsCalendar,
    avgNightlyRateOverBookings,
  };
})();
