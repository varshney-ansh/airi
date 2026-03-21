'use client'
import { useState } from "react";
import CustomOptions from "./common/CustomOptions";
import { RegisterNewUser } from "@/lib/actions";
import { useRouter } from "next/navigation";
import "../index.css"

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAYS = Array.from({ length: 31 }, (_, i) =>
  String(i + 1).padStart(2, "0"),
);

const YEARS = Array.from({ length: 100 }, (_, i) =>
  String(new Date().getFullYear() - i),
);

const COUNTRIES = [
  "India",
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Japan",
  "China",
  "Brazil",
];

function LoginDetailForm({ session }) {
  const [error, setError] = useState("");
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()]);
  const [day, setDay] = useState(new Date().getDate());
  const [year, setYear] = useState(new Date().getFullYear());
  const [country, setCountry] = useState("");
  const router = useRouter();

  const handleSubmit = async () => {
    const dob = new Date(`${month} ${day}, ${year}`);
    const result = await RegisterNewUser({ data: { email: session.user.email, name: session.user.name, profile_img: session.user.picture, user_id: session.user.sub, dob, country } });
    if (result.success) {
      router.push("/");
    } else {
      setError(result.message);
    }
  }

  return (
    <div className="w-full min-h-screen flex justify-center items-center">
      <div className="w-full max-w-lg flex flex-col items-center text-center p-8">
        <h1 className="text-3xl font-semibold mb-4 text-text-primary">
          Let's add some details to
          <br />
          your account
        </h1>
        <p className="text-sm text-text-muted mb-10 leading-relaxed max-w-md">
          This helps provide you with age-appropriate settings. Your data is
          securely protected with encryption and other security best practices.
        </p>

        {/* Birthdate */}
        <div className="w-full text-left mb-6">
          <label className="block text-sm font-medium mb-2">
           Birthdate *
          </label>
          <CustomOptions
            label="Month"
            options={MONTHS}
            value={month}
            onChange={setMonth}
            error={error}
          />
          <div className="flex gap-4 mt-4">
            <CustomOptions
              label={"Day"}
              options={DAYS}
              value={day}
              onChange={setDay}
              error={error}
            />
            <CustomOptions
              label={"Year"}
              options={YEARS}
              value={year}
              onChange={setYear}
              error={error}
            />
          </div>
          {error && (
            <p className="text-xs text-accent-red mt-2">
              Sorry, your account cannot be created based on the information you
              provided
            </p>
          )}
        </div>

        <div className="w-full text-left mb-10">
          <label className="block text-sm font-medium mb-2">
            Country / region *
          </label>
          <CustomOptions
            label=""
            options={COUNTRIES}
            value={country}
            onChange={setCountry}
          />
        </div>

        <p className="text-xs text-text-muted mb-6">
          By continuing to use Copilot, you agree to the{" "}
          <a href="#" className="underline hover:text-text-primary">
            Terms of Use
          </a>
          . See our{" "}
          <a href="#" className="underline hover:text-text-primary">
            Privacy Statement
          </a>
          .
        </p>

        <button onClick={handleSubmit} 
        className="w-full cursor-pointer py-3 rounded-lg bg-bg-hover text-text-muted text-sm font-medium transition-colors">
          Continue
        </button>
      </div>
    </div>
  );
}

export default LoginDetailForm;
