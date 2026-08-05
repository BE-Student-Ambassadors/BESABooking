import { db } from "../config/firebaseAdmin.js";

type query = {
  id?: string
  lastName?: string
}

export const bookingsRepository = {
  async findByReference(query: query) {
    if (!query?.id && !query?.lastName) return {query: null, message: "Need at least lastName or id"}
    const bookingRef = db.collection("Bookings")
    //ensures that the tour exists within the database
    async function validate(tourId: string): Promise<Tour | null> {
      const tourRef = await db.collection("Tours").doc(tourId).get()
      if (tourRef.exists) {
        return tourRef.data() as Tour;
      } else {
        return null;
      }
    }

    let newQuery: {booking: BookingData, booking_id: string, tour?: Tour} | null = null
    let message: string = ""

    if (query.id) {
      const booking = await bookingRef.doc(query.id).get()
      if (booking.exists) {
        newQuery = {booking: booking.data() as BookingData, booking_id: booking.id}
      }
    }

    if (query.lastName) {
      const results = await bookingRef.where("lastName", "==", query.lastName).limit(5).get()
      if (!results.empty) {
        // sort descending (most recent first) using key
        let earliestBooking: BookingData | null = null;
        let earliestId: string = "";
        let length = 0;
        results.forEach((doc) => {
          const data = doc.data() as BookingData
          if (length != 0 && earliestBooking && new Date(data.date).getTime() < new Date(earliestBooking.date).getTime()) {
            console.log(doc)
            earliestBooking = data
            earliestId = doc.id
          } else {
            earliestBooking = data
            earliestId = doc.id
          }
          length++
        })
        if (earliestBooking) {
          newQuery = {booking: earliestBooking, booking_id: earliestId}
        }
        message = (length > 1) ? "Found multiple bookings; showing the most recent. Consider using the booking id" : ""
      }
    }
    //Validates to make sure it is apart of a tour.
    if (newQuery?.booking.tourId) {
      const isValid = await validate(newQuery.booking.tourId)
      if (isValid) {
        newQuery.tour = isValid
        return {
          query: newQuery,
          message: message
        }
      } else {
        return {
          query: null,
          message: "Could not fetch booking. Please try again."
        }
      }
    }
    
    return {
      message: "No booking found for that ID or last name.",
      query: null
    };
  },

  async getById(bookingId: string) {
    const snapshot = await db.collection("Bookings").doc(bookingId).get();
    return {
      id: snapshot.id,
      ...snapshot.data(),
    } as Record<string, unknown>;
  },

  async create(payload: unknown) {
    return {
      message: "TODO: persist booking and side effects here.",
      payload,
    };
  },

  async reschedule(bookingId: string, payload: BookingData, besas: unknown) {
    const toMinutes = (t: string) => {
      if (!t || !t.includes(":")) return -1;
      const [h, mPart] = t.split(":");
      const [m, ampmMaybe] = mPart.split(" ");
      let mins = parseInt(h, 10) % 12 * 60 + parseInt(m, 10);
      if (ampmMaybe?.toUpperCase() === "PM") mins += 12 * 60;
      // if already 24h, ampmMaybe undefined, above still fine
      if (!ampmMaybe && h.length === 2) {
        const hh = parseInt(h, 10);
        mins = hh * 60 + parseInt(m, 10);
      }
      return mins;

    };
    //Unsure what to do with BESAS
    //Make sure time does not conflict with another one. 
    const dateVal = payload?.date
    const timeLabel = payload?.time || ""
    const bookingsCol = db.collection("Bookings");
    const qSnap = await bookingsCol.where("date", "==", dateVal).get()
    //variable with conflict
    const conflict = qSnap.docs.some((d) => {
      if (d.id === bookingId) return false;
      const data = d.data() as BookingData;
      const bookedTime = data.time || data.startTime;
      if (!bookedTime) return false;
      return toMinutes(bookedTime) === toMinutes(timeLabel);
    });

    if (conflict) {
      return {
        message: "That time is already booked for another tour. Please choose a different time.",
        bookingId,
        payload: null,
        besas
      }
    }
    
    const bookingRef = db.collection("Bookings").doc(bookingId)
    await bookingRef.update({...payload})
    return {
      message: "",
      bookingId,
      payload,
      besas,
    };
    
  },

  async cancel(bookingId: string) {
    await db.collection("Bookings").doc(bookingId).delete();
  },
};
