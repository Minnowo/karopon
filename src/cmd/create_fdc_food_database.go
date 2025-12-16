package cmd

import (
	"context"
	"encoding/json"
	"fmt"
	"karopon/src/database"
	"karopon/src/database/connection"
	"os"

	"github.com/rs/zerolog/log"
	"github.com/urfave/cli/v3"
)

type tNutrient struct {
	Type     string `json:"type"`
	Nutrient struct {
		Name string `json:"name"`
		Unit string `json:"unitName"`
	} `json:"nutrient"`
	MaxValue float32 `json:"max"`
	MinValue float32 `json:"min"`
	MidValue float32 `json:"median"`
	Value    float32 `json:"amount"`
}
type tNutrientConv struct {
	// We only care about the .CalorieConversionFactor
	Type    string  `json:"type"`
	Protein float32 `json:"proteinValue"`
	Fat     float32 `json:"fatValue"`
	Carbs   float32 `json:"carbohydrateValue"`
}

type tFood struct {
	FoodClass          string          `json:"foodClass"`
	Name               string          `json:"description"`
	PublicationDate    string          `json:"publicationDate"`
	FDCID              int             `json:"fdcid"`
	NDBID              int             `json:"ndbNumber"`
	Nutrients          []tNutrient     `json:"foodNutrients"`
	NutrientConversion []tNutrientConv `json:"nutrientConversionFactors"`
}

func CmdCreateFDC(ctx context.Context, c *cli.Command) error {

	dbconn := c.Value("database-conn").(string)
	// username := c.Value("username").(string)
	fdcJson := c.Value("fdc-dataset").(string)

	conn, err := connection.Connect(context.Background(), database.POSTGRES, dbconn)

	if err != nil {
		return err
	}

	ctx = context.Background()

	if err := conn.Migrate(ctx); err != nil {
		return err
	}

	file, err := os.Open(fdcJson)

	if err != nil {
		return err
	}

	defer file.Close()

	dec := json.NewDecoder(file)

	if tok, err := dec.Token(); err != nil {
		return err
	} else if d, ok := tok.(json.Delim); !ok || d != '{' {
		return fmt.Errorf("expected { token")
	}

	if tok, err := dec.Token(); err != nil {
		return err
	} else if d, ok := tok.(string); !ok || (d != "FoundationFoods" && d != "BrandedFoods") {
		return fmt.Errorf("expected FoundationFoods")
	}

	if tok, err := dec.Token(); err != nil {
		return err
	} else if d, ok := tok.(json.Delim); !ok || d != '[' {
		return fmt.Errorf("expected [ token")
	}

	nutrientsWeCareAbout := map[string]bool{

		// prefer by summation, unless it's not available, then use by difference
		"Carbohydrate, by summation":  true,
		"Carbohydrate, by difference": true,

		"Protein":           true,
		"Total lipid (fat)": true,

		// prefer this over the AOAC, but fallback to AOAC
		"Fiber, total dietary":               true,
		"Total dietary fiber (AOAC 2011.25)": true,

		"Iron, Fe": true,
	}

	for dec.More() {

		var food tFood

		if err := dec.Decode(&food); err != nil {
			return err
		}

		n := 0
		for _, nutrient := range food.Nutrients {
			if _, ok := nutrientsWeCareAbout[nutrient.Nutrient.Name]; ok {
				n++
			}
		}
		newNutrient := make([]tNutrient, n)
		n = 0
		for _, nutrient := range food.Nutrients {
			if _, ok := nutrientsWeCareAbout[nutrient.Nutrient.Name]; ok {
				newNutrient[n] = nutrient
				n++
			}
		}
		food.Nutrients = newNutrient

		log.Info().
			// Interface("nutrient", food).
			Interface("nutrient", food.Nutrients).
			// Str("name", food.Name).
			// Int("fdc", food.FDCID).
			// Int("ndb", food.NDBID).
			Msg("")
	}

	return nil
}
