package database

import "github.com/pkg/errors"

type Macronutrient string

var (
	MacronutrientCarbs    Macronutrient = "CARB"
	MacronutrientNetCarbs Macronutrient = "NET_CARB"
	MacronutrientFat      Macronutrient = "FAT"
	MacronutrientFibre    Macronutrient = "FIBRE"
	MacronutrientProtein  Macronutrient = "PROTEIN"
	MacronutrientCalorie  Macronutrient = "CALORIE" // yes this isn't a nutrient but close enough
)
var (
	ErrInvalidMacronutrient = errors.New("invalid macronutrient")
)

func (s Macronutrient) IsValid() bool {
	switch s {
	case MacronutrientCarbs, MacronutrientNetCarbs, MacronutrientFat, MacronutrientFibre, MacronutrientProtein:
		return true
	default:
		return false
	}
}
