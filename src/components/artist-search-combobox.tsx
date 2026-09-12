"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, X, Check, Shuffle, User, ChevronDown, Sparkles } from "lucide-react";
import { ARTISTS_DATA, getArtistById, type Artist } from "@/lib/trap-data";

interface ArtistSearchComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  allowNone?: boolean;
  noneLabel?: string;
  excludeArtistId?: string;
  className?: string;
  compact?: boolean;
}

// Helper to remove accents for fuzzy search (e.g. "carrion" -> "carrion", "Carrión" -> "carrion")
function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function ArtistSearchCombobox({
  value,
  onValueChange,
  placeholder = "Seleccionar artista...",
  allowNone = false,
  noneLabel = "— Sin feature —",
  excludeArtistId,
  className = "",
  compact = false,
}: ArtistSearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus search input when popover opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setSearch("");
      setSelectedGroup("all");
    }
  }, [open]);

  // Resolve currently selected artist object
  const currentArtist = useMemo(() => {
    if (!value || value === "none") return null;
    return getArtistById(value);
  }, [value]);

  // All artists across all groups
  const allArtistsWithGroup = useMemo(() => {
    return ARTISTS_DATA.flatMap((group) =>
      group.artists
        .filter((a) => a.id !== excludeArtistId)
        .map((a) => ({
          ...a,
          groupLabel: group.label,
        }))
    );
  }, [excludeArtistId]);

  // Normalized search query
  const query = useMemo(() => normalizeText(search), [search]);

  // Filtered artists based on search and selected group
  const filteredArtists = useMemo(() => {
    return allArtistsWithGroup.filter((artist) => {
      // Group filter
      if (selectedGroup !== "all" && artist.groupLabel !== selectedGroup) {
        return false;
      }

      // If search query is empty, pass all
      if (!query) return true;

      // Match name
      if (normalizeText(artist.name).includes(query)) return true;

      // Match origin
      if (normalizeText(artist.origin).includes(query)) return true;

      // Match ad-libs
      if (artist.adlibs?.some((adlib) => normalizeText(adlib).includes(query))) {
        return true;
      }

      // Match style tags or description
      if (normalizeText(artist.style).includes(query)) return true;

      // Match beat tags
      if (artist.beatTags?.some((bt) => normalizeText(bt).includes(query))) {
        return true;
      }

      // Match group label
      if (normalizeText(artist.groupLabel).includes(query)) return true;

      return false;
    });
  }, [allArtistsWithGroup, query, selectedGroup]);

  // Pick a random artist from current filtered list
  const handlePickRandom = (e: React.MouseEvent) => {
    e.stopPropagation();
    const pool = filteredArtists.length > 0 ? filteredArtists : allArtistsWithGroup;
    if (pool.length === 0) return;
    const random = pool[Math.floor(Math.random() * pool.length)];
    onValueChange(random.id);
    setOpen(false);
  };

  // Select artist handler
  const handleSelect = (artistId: string) => {
    onValueChange(artistId);
    setOpen(false);
  };

  // Group labels for filter pills
  const filterCategories = useMemo(() => {
    const list = [
      { id: "all", label: "Todos", count: allArtistsWithGroup.length },
    ];
    for (const g of ARTISTS_DATA) {
      const count = g.artists.filter((a) => a.id !== excludeArtistId).length;
      if (count > 0) {
        list.push({ id: g.label, label: g.label, count });
      }
    }
    return list;
  }, [allArtistsWithGroup, excludeArtistId]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={`group flex items-center justify-between gap-2 rounded-md border border-border/40 bg-black/40 px-3 text-left transition-all hover:border-slime/50 hover:bg-black/60 focus:outline-none focus:ring-1 focus:ring-slime/50 cursor-pointer ${
            compact ? "h-7 text-[11px] py-1" : "h-10 text-xs sm:text-sm py-2"
          } ${className}`}
        >
          <div className="flex items-center gap-2 truncate min-w-0">
            {currentArtist ? (
              <>
                <span className="text-slime shrink-0">👤</span>
                <span className="font-semibold text-foreground truncate">
                  {currentArtist.name}
                </span>
                <span className="text-muted-foreground text-[11px] truncate hidden xs:inline">
                  · {currentArtist.origin}
                </span>
              </>
            ) : allowNone && value === "none" ? (
              <span className="text-muted-foreground italic truncate">
                {noneLabel}
              </span>
            ) : (
              <span className="text-muted-foreground truncate">
                {placeholder}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground group-hover:text-slime transition-colors">
            <Search className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                open ? "rotate-180" : ""
              }`}
            />
          </div>
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[330px] sm:w-[460px] max-h-[min(560px,85vh)] flex flex-col p-0 bg-background/95 backdrop-blur-xl border border-slime/30 shadow-2xl shadow-slime/5 rounded-xl overflow-hidden z-50 animate-in fade-in-0 zoom-in-95"
      >
        {/* Header with Search Input */}
        <div className="p-3 border-b border-border/40 bg-black/40 space-y-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && filteredArtists.length > 0) {
                    e.preventDefault();
                    handleSelect(filteredArtists[0].id);
                  }
                }}
                placeholder="Buscar artista, origen, estilo o ad-lib..."
                className="w-full h-9 pl-9 pr-8 bg-black/60 border border-border/50 rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-slime/60 transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Random Pick Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePickRandom}
              title="Elegir artista al azar de esta selección"
              className="h-9 px-2.5 bg-black/60 border-slime/30 text-slime hover:bg-slime/15 hover:border-slime/60 shrink-0 text-xs flex items-center gap-1.5"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Aleatorio</span>
            </Button>
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar text-[11px]">
            {filterCategories.map((cat) => {
              const isActive = selectedGroup === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedGroup(cat.id)}
                  className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-all border shrink-0 flex items-center gap-1 ${
                    isActive
                      ? "bg-slime/20 text-slime border-slime/60 font-semibold shadow-xs shadow-slime/20"
                      : "bg-black/30 text-muted-foreground border-border/40 hover:text-foreground hover:border-border/80"
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className="text-[10px] opacity-70">({cat.count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Results Info Bar */}
        <div className="px-3 py-1.5 bg-black/20 border-b border-border/20 flex items-center justify-between text-[10px] text-muted-foreground shrink-0">
          <span>
            {filteredArtists.length}{" "}
            {filteredArtists.length === 1 ? "artista" : "artistas encontrados"}
          </span>
          {search && (
            <button
              onClick={() => {
                setSearch("");
                setSelectedGroup("all");
              }}
              className="text-slime hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Scrollable Artists List */}
        <div className="flex-1 min-h-0 max-h-[380px] overflow-y-auto overflow-x-hidden p-2 overscroll-contain custom-scroll">
          {/* Optional "None" item for feature */}
          {allowNone && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => handleSelect("none")}
              className={`flex items-center justify-between p-2.5 mb-1.5 rounded-lg border transition-all cursor-pointer ${
                value === "none"
                  ? "bg-slime/10 border-slime/50 text-slime font-semibold"
                  : "bg-black/20 border-transparent hover:bg-black/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">🚫</span>
                <span className="text-xs">{noneLabel}</span>
              </div>
              {value === "none" && <Check className="w-4 h-4 text-slime" />}
            </div>
          )}

          {filteredArtists.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-xs text-muted-foreground">
                No encontramos artistas con "{search}"
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setSelectedGroup("all");
                }}
                className="text-xs border-slime/40 text-slime hover:bg-slime/10"
              >
                Ver todos los artistas
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredArtists.map((artist) => {
                const isSelected = value === artist.id;
                return (
                  <div
                    key={artist.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelect(artist.id)}
                    className={`group/item flex flex-col p-2.5 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-slime/10 border-slime/50 shadow-xs shadow-slime/10"
                        : "bg-black/20 border-transparent hover:bg-black/50 hover:border-border/60"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-xs text-slime shrink-0">👤</span>
                        <span
                          className={`text-xs font-semibold truncate ${
                            isSelected
                              ? "text-slime"
                              : "text-foreground group-hover/item:text-slime transition-colors"
                          }`}
                        >
                          {artist.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground/80 truncate">
                          · {artist.origin}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {artist.defaultSpanglish !== undefined && (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 py-0 h-4 border-cyber/30 text-cyber hidden sm:inline-flex"
                          >
                            {artist.defaultSpanglish}% EN
                          </Badge>
                        )}
                        {isSelected && (
                          <Check className="w-4 h-4 text-slime shrink-0" />
                        )}
                      </div>
                    </div>

                    {/* Style and Ad-libs Preview */}
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground/70 line-clamp-1 flex-1">
                        {artist.style}
                      </span>
                      {artist.adlibs && artist.adlibs.length > 0 && (
                        <div className="flex items-center gap-1 shrink-0">
                          {artist.adlibs.slice(0, 2).map((adlib, i) => (
                            <span
                              key={i}
                              className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slime/5 text-slime/80 border border-slime/20"
                            >
                              {adlib}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
