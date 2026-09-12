"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Search, X, Check, ChevronDown, Sparkles, Mic2, Users, Flame, Zap } from "lucide-react";
import { ARTISTS_DATA, getArtistById, type Artist } from "@/lib/trap-data";

export interface SectionVoiceComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  mainArtistName?: string;
  featureArtistName?: string;
  hasFeature?: boolean;
  className?: string;
}

// Helper for accent-insensitive search
function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

interface VoiceRole {
  id: string;
  label: string;
  subtitle: string;
  icon: string;
  badge?: string;
}

export function SectionVoiceCombobox({
  value,
  onValueChange,
  mainArtistName,
  featureArtistName,
  hasFeature = false,
  className = "",
}: SectionVoiceComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search input on popover open
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setSearch("");
      setSelectedCategory("all");
    }
  }, [open]);

  // Roles list definition
  const roles: VoiceRole[] = useMemo(() => {
    const list: VoiceRole[] = [
      {
        id: "auto",
        label: "— Voz: Auto —",
        subtitle: "Cadencia y voz natural de la estructura",
        icon: "🎯",
        badge: "Auto",
      },
      {
        id: "main",
        label: mainArtistName ? `Main Artist (${mainArtistName})` : "Main Artist",
        subtitle: "Voz principal del track al frente",
        icon: "👑",
        badge: "Lead",
      },
    ];

    if (hasFeature) {
      list.push(
        {
          id: "feature",
          label: featureArtistName ? `Feature Artist (${featureArtistName})` : "Feature Artist",
          subtitle: "Artista invitado al frente",
          icon: "🤝",
          badge: "Feat",
        },
        {
          id: "trading_2x2",
          label: "🤝 Trading Bars (2x2)",
          subtitle: "Rimas alternadas compás a compás (Lead / Feat)",
          icon: "⚡",
          badge: "2x2",
        }
      );
    }

    list.push(
      {
        id: "both",
        label: "Both (Unísono)",
        subtitle: "Ambas voces a la vez, estilo coro masivo",
        icon: "👥",
        badge: "Unísono",
      },
      {
        id: "hype",
        label: "Hype Man",
        subtitle: "Segundas voces, gritos de apoyo y ad-libs marcados",
        icon: "🔥",
        badge: "Support",
      }
    );

    return list;
  }, [mainArtistName, featureArtistName, hasFeature]);

  // All artists with group label
  const allArtistsWithGroup = useMemo(() => {
    return ARTISTS_DATA.flatMap((group) =>
      group.artists.map((a) => ({
        ...a,
        groupLabel: group.label,
      }))
    );
  }, []);

  const query = useMemo(() => normalizeText(search), [search]);

  // Filtered roles
  const filteredRoles = useMemo(() => {
    if (selectedCategory !== "all" && selectedCategory !== "roles") return [];
    if (!query) return roles;
    return roles.filter(
      (r) =>
        normalizeText(r.label).includes(query) ||
        normalizeText(r.subtitle).includes(query) ||
        (r.badge && normalizeText(r.badge).includes(query)) ||
        normalizeText(r.id).includes(query)
    );
  }, [roles, query, selectedCategory]);

  // Filtered artists
  const filteredArtists = useMemo(() => {
    if (selectedCategory === "roles") return [];
    return allArtistsWithGroup.filter((artist) => {
      if (selectedCategory !== "all" && artist.groupLabel !== selectedCategory) {
        return false;
      }
      if (!query) return true;
      if (normalizeText(artist.name).includes(query)) return true;
      if (normalizeText(artist.origin).includes(query)) return true;
      if (artist.adlibs?.some((adlib) => normalizeText(adlib).includes(query))) return true;
      if (normalizeText(artist.style).includes(query)) return true;
      if (artist.beatTags?.some((bt) => normalizeText(bt).includes(query))) return true;
      if (normalizeText(artist.groupLabel).includes(query)) return true;
      return false;
    });
  }, [allArtistsWithGroup, query, selectedCategory]);

  const totalResults = filteredRoles.length + filteredArtists.length;

  // Selected label display in trigger
  const triggerDisplay = useMemo(() => {
    const foundRole = roles.find((r) => r.id === value);
    if (foundRole) {
      return {
        icon: foundRole.icon,
        text: foundRole.id === "auto" ? "— Voz: Auto —" : foundRole.label,
        isRole: true,
      };
    }
    const foundArtist = getArtistById(value);
    if (foundArtist) {
      return {
        icon: "👤",
        text: foundArtist.name,
        isRole: false,
      };
    }
    return {
      icon: "🎯",
      text: "— Voz: Auto —",
      isRole: true,
    };
  }, [value, roles]);

  const handleSelect = (id: string) => {
    onValueChange(id);
    setOpen(false);
  };

  // Filter pills
  const categories = useMemo(() => {
    const list = [
      { id: "all", label: "Todos", count: roles.length + allArtistsWithGroup.length },
      { id: "roles", label: "Roles", count: roles.length },
    ];
    for (const g of ARTISTS_DATA) {
      list.push({ id: g.label, label: g.label, count: g.artists.length });
    }
    return list;
  }, [roles, allArtistsWithGroup]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={`h-7 text-[10px] w-[130px] sm:w-[160px] bg-black/40 border border-border/40 rounded-md px-2 flex items-center justify-between gap-1.5 transition-all hover:border-slime/50 hover:bg-black/60 focus:outline-none focus:ring-1 focus:ring-slime/50 cursor-pointer ${className}`}
        >
          <div className="flex items-center gap-1.5 truncate min-w-0">
            <span className="shrink-0 text-xs">{triggerDisplay.icon}</span>
            <span className={`truncate font-medium ${triggerDisplay.isRole ? "text-foreground/90" : "text-slime font-semibold"}`}>
              {triggerDisplay.text}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0 text-muted-foreground">
            <Search className="w-2.5 h-2.5 opacity-60" />
            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
          </div>
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[320px] sm:w-[420px] max-h-[min(540px,85vh)] flex flex-col p-0 bg-background/95 backdrop-blur-xl border border-slime/30 shadow-2xl shadow-slime/5 rounded-xl overflow-hidden z-50 animate-in fade-in-0 zoom-in-95"
      >
        {/* Header with Search Input */}
        <div className="p-2.5 border-b border-border/40 bg-black/40 space-y-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (filteredRoles.length > 0) {
                    e.preventDefault();
                    handleSelect(filteredRoles[0].id);
                  } else if (filteredArtists.length > 0) {
                    e.preventDefault();
                    handleSelect(filteredArtists[0].id);
                  }
                }
              }}
              placeholder="Buscar voz, rol o artista..."
              className="w-full h-8 pl-8 pr-8 bg-black/60 border border-border/50 rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-slime/60 transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none no-scrollbar text-[10px]">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2 py-0.5 rounded-full whitespace-nowrap transition-all border shrink-0 flex items-center gap-1 ${
                    isActive
                      ? "bg-slime/20 text-slime border-slime/60 font-semibold"
                      : "bg-black/30 text-muted-foreground border-border/40 hover:text-foreground hover:border-border/80"
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className="text-[9px] opacity-70">({cat.count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Results Info Bar */}
        <div className="px-3 py-1 bg-black/20 border-b border-border/20 flex items-center justify-between text-[10px] text-muted-foreground shrink-0">
          <span>
            {totalResults} {totalResults === 1 ? "opción" : "opciones disponibles"}
          </span>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setSelectedCategory("all");
              }}
              className="text-slime hover:underline"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Scrollable Content Container (Smooth Native Scrollbar) */}
        <div className="flex-1 min-h-0 max-h-[340px] overflow-y-auto overflow-x-hidden p-2 overscroll-contain custom-scroll space-y-3">
          {totalResults === 0 ? (
            <div className="py-8 text-center space-y-1.5">
              <p className="text-xs text-muted-foreground">
                No encontramos voces o artistas con "{search}"
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSelectedCategory("all");
                }}
                className="text-[11px] text-slime hover:underline"
              >
                Ver todas las opciones
              </button>
            </div>
          ) : (
            <>
              {/* Special Roles Group */}
              {filteredRoles.length > 0 && (
                <div className="space-y-1">
                  <div className="px-1.5 py-0.5 text-[9px] font-semibold tracking-wider uppercase text-slime/80">
                    Roles de Estructura
                  </div>
                  <div className="space-y-1">
                    {filteredRoles.map((role) => {
                      const isSelected = value === role.id;
                      return (
                        <div
                          key={role.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleSelect(role.id)}
                          className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-slime/15 border-slime/60 shadow-xs text-slime font-semibold"
                              : "bg-black/20 border-transparent hover:bg-black/50 hover:border-border/60 text-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm shrink-0">{role.icon}</span>
                            <div className="min-w-0">
                              <div className="text-xs font-medium truncate">{role.label}</div>
                              <div className="text-[10px] text-muted-foreground/80 truncate">
                                {role.subtitle}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            {role.badge && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-slime/30 text-slime/90">
                                {role.badge}
                              </Badge>
                            )}
                            {isSelected && <Check className="w-3.5 h-3.5 text-slime shrink-0" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Individual Artists Group */}
              {filteredArtists.length > 0 && (
                <div className="space-y-1">
                  <div className="px-1.5 py-0.5 text-[9px] font-semibold tracking-wider uppercase text-muted-foreground/80">
                    Artistas Disponibles ({filteredArtists.length})
                  </div>
                  <div className="space-y-1">
                    {filteredArtists.map((artist) => {
                      const isSelected = value === artist.id;
                      return (
                        <div
                          key={artist.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleSelect(artist.id)}
                          className={`flex flex-col p-2 rounded-lg border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-slime/15 border-slime/60 shadow-xs"
                              : "bg-black/20 border-transparent hover:bg-black/50 hover:border-border/60"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-xs text-slime shrink-0">👤</span>
                              <span
                                className={`text-xs font-semibold truncate ${
                                  isSelected ? "text-slime" : "text-foreground hover:text-slime"
                                }`}
                              >
                                {artist.name}
                              </span>
                              <span className="text-[10px] text-muted-foreground/80 truncate">
                                · {artist.origin}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {artist.defaultSpanglish !== undefined && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] px-1 py-0 h-3.5 border-cyber/30 text-cyber"
                                >
                                  {artist.defaultSpanglish}% EN
                                </Badge>
                              )}
                              {isSelected && <Check className="w-3.5 h-3.5 text-slime shrink-0" />}
                            </div>
                          </div>

                          <div className="mt-0.5 flex items-center justify-between gap-1 text-[10px] text-muted-foreground/70">
                            <span className="line-clamp-1 flex-1">{artist.style}</span>
                            {artist.adlibs && artist.adlibs.length > 0 && (
                              <span className="font-mono text-[9px] text-slime/80 shrink-0">
                                ({artist.adlibs[0]})
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
