"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type City = { id: number; name: string };
type Area = { id: number; name: string };
type Community = { id: number; name: string };

export default function LocationFilters() {
  const [cities, setCities] = useState<City[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);

  const [cityId, setCityId] = useState<number | "">("");
  const [areaId, setAreaId] = useState<number | "">("");
  const [communityId, setCommunityId] = useState<number | "">("");

  // Load cities on first load
  useEffect(() => {
    const loadCities = async () => {
      const { data, error } = await supabase
        .from("cities")
        .select("id, name")
        .order("name", { ascending: true });

      if (!error && data) setCities(data);
    };
    loadCities();
  }, []);

  // When city changes, load areas
  useEffect(() => {
    if (!cityId) {
      setAreas([]);
      setAreaId("");
      setCommunities([]);
      setCommunityId("");
      return;
    }

    const loadAreas = async () => {
      const { data, error } = await supabase
        .from("areas")
        .select("id, name")
        .eq("city_id", cityId)
        .order("name", { ascending: true });

      if (!error && data) {
        setAreas(data);
        setAreaId("");
        setCommunities([]);
        setCommunityId("");
      }
    };
    loadAreas();
  }, [cityId]);

  // When area changes, load communities
  useEffect(() => {
    if (!areaId) {
      setCommunities([]);
      setCommunityId("");
      return;
    }

    const loadCommunities = async () => {
      const { data, error } = await supabase
        .from("communities")
        .select("id, name")
        .eq("area_id", areaId)
        .order("name", { ascending: true });

      if (!error && data) {
        setCommunities(data);
        setCommunityId("");
      }
    };
    loadCommunities();
  }, [areaId]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
      <input
        type="text"
        placeholder="Search items (e.g. iPhone, sofa...)"
        className="border rounded-md px-3 py-2 text-sm w-full"
      />

      {/* City dropdown */}
      <select
        className="border rounded-md px-3 py-2 text-sm w-full"
        value={cityId}
        onChange={(e) =>
          setCityId(e.target.value ? Number(e.target.value) : "")
        }
      >
        <option value="">City</option>
        {cities.map((city) => (
          <option key={city.id} value={city.id}>
            {city.name}
          </option>
        ))}
      </select>

      {/* Area dropdown */}
      <select
        className="border rounded-md px-3 py-2 text-sm w-full"
        value={areaId}
        onChange={(e) =>
          setAreaId(e.target.value ? Number(e.target.value) : "")
        }
        disabled={!cityId}
      >
        <option value="">
          {cityId ? "Area" : "Select city first"}
        </option>
        {areas.map((area) => (
          <option key={area.id} value={area.id}>
            {area.name}
          </option>
        ))}
      </select>

      {/* Community / Building dropdown */}
      <select
        className="border rounded-md px-3 py-2 text-sm w-full"
        value={communityId}
        onChange={(e) =>
          setCommunityId(e.target.value ? Number(e.target.value) : "")
        }
        disabled={!areaId}
      >
        <option value="">
          {areaId ? "Community / Building" : "Select area first"}
        </option>
        {communities.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
