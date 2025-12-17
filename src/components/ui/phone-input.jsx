import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const COUNTRIES = [
    { code: "MA", name: "Morocco", dialCode: "+212", flag: "🇲🇦" },
    { code: "FR", name: "France", dialCode: "+33", flag: "🇫🇷" },
    { code: "US", name: "United States", dialCode: "+1", flag: "🇺🇸" },
    { code: "GB", name: "United Kingdom", dialCode: "+44", flag: "🇬🇧" },
    { code: "ES", name: "Spain", dialCode: "+34", flag: "🇪🇸" },
    { code: "DE", name: "Germany", dialCode: "+49", flag: "🇩🇪" },
    { code: "IT", name: "Italy", dialCode: "+39", flag: "🇮🇹" },
    { code: "BE", name: "Belgium", dialCode: "+32", flag: "🇧🇪" },
    { code: "NL", name: "Netherlands", dialCode: "+31", flag: "🇳🇱" },
    { code: "SA", name: "Saudi Arabia", dialCode: "+966", flag: "🇸🇦" },
    { code: "AE", name: "UAE", dialCode: "+971", flag: "🇦🇪" },
    { code: "EG", name: "Egypt", dialCode: "+20", flag: "🇪🇬" },
    { code: "DZ", name: "Algeria", dialCode: "+213", flag: "🇩🇿" },
    { code: "TN", name: "Tunisia", dialCode: "+216", flag: "🇹🇳" },
];

function PhoneInput({
    value,
    onChange,
    defaultCountry = "MA",
    disabled = false,
    className,
    ...props
}) {
    const [countryCode, setCountryCode] = React.useState(defaultCountry);
    const [phoneNumber, setPhoneNumber] = React.useState("");

    const selectedCountry = COUNTRIES.find((c) => c.code === countryCode) || COUNTRIES[0];

    // Parse initial value if provided
    React.useEffect(() => {
        if (value) {
            // Try to extract country code from value
            const country = COUNTRIES.find((c) => value.startsWith(c.dialCode));
            if (country) {
                setCountryCode(country.code);
                setPhoneNumber(value.slice(country.dialCode.length));
            } else {
                setPhoneNumber(value);
            }
        }
    }, []);

    const handlePhoneChange = (e) => {
        let input = e.target.value;
        // Remove non-digit characters except for leading zeros
        input = input.replace(/[^\d]/g, "");
        // Remove leading zero if present (since we add country code)
        if (input.startsWith("0")) {
            input = input.slice(1);
        }
        setPhoneNumber(input);

        // Notify parent with full E.164 format
        const fullNumber = selectedCountry.dialCode + input;
        onChange?.(fullNumber);
    };

    const handleCountryChange = (code) => {
        setCountryCode(code);
        const country = COUNTRIES.find((c) => c.code === code);
        if (country && phoneNumber) {
            const fullNumber = country.dialCode + phoneNumber;
            onChange?.(fullNumber);
        }
    };

    return (
        <div className={cn("flex gap-2", className)}>
            <Select value={countryCode} onValueChange={handleCountryChange} disabled={disabled}>
                <SelectTrigger className="w-[100px] shrink-0">
                    <SelectValue>
                        <span className="flex items-center gap-1.5">
                            <span>{selectedCountry.flag}</span>
                            <span className="text-xs text-muted-foreground">{selectedCountry.dialCode}</span>
                        </span>
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                    {COUNTRIES.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                            <span className="flex items-center gap-2">
                                <span>{country.flag}</span>
                                <span>{country.name}</span>
                                <span className="text-xs text-muted-foreground ml-auto">{country.dialCode}</span>
                            </span>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Input
                type="tel"
                value={phoneNumber}
                onChange={handlePhoneChange}
                placeholder="600 000 000"
                disabled={disabled}
                className="flex-1"
                {...props}
            />
        </div>
    );
}

export { PhoneInput, COUNTRIES };
