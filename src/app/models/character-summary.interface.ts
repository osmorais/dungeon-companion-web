export interface CharacterSummary {
  id_character: number;
  name: string;
  level: number;
  race: string;
  class: string;
}

export interface CharacterPagedList {
  CharacterPagedList: CharacterSummary[];
  page: number;
  pageSize: number;
  total_count: number;
}
