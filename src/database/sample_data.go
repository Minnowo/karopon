package database

import (
	"context"

	"github.com/rs/zerolog/log"
)

func CreateSampleData(ctx context.Context, db DB, username string) error {

	var user TblUser
	user.Name = username

	if err := db.LoadUser(ctx, user.Name, &user); err != nil {
		id, err := db.AddUser(ctx, &user)
		if err != nil {
			return err
		}
		user.ID = id
	}

	log.Info().Int("id", user.ID).Str("name", user.Name).Msg("test data user")

	event1 := TblUserEvent{UserID: user.ID, Name: "lunch"}
	if id, err := db.AddUserEvent(ctx, &event1); err != nil {
		return err
	} else {
		event1.ID = id
	}

	// userEvent1 := TblUserEventLog{
	// 	UserID:                   user.ID,
	// 	EventID:                  event1.ID,
	// 	UserTime:                 UnixMillis(time.Now()),
	// 	Event:                    event1.Name,
	// 	NetCarbs:                 0,
	// 	BloodGlucose:             0,
	// 	BloodGlucoseTarget:       0,
	// 	InsulinSensitivityFactor: 0,
	// 	InsulinToCarbRatio:       0,
	// 	RecommendedInsulinAmount: 0,
	// 	ActualInsulinTaken:       0,
	// }
	// if id, err := db.AddUserEventLog(ctx, &userEvent1); err != nil {
	// 	return err
	// } else {
	// 	userEvent1.ID = id
	// }
	food1 := TblUserFood{UserID: user.ID, Name: "tim bar", Portion: 1, Unit: "bar", Protein: 6, Carb: 22, Fibre: 4, Fat: 15}

	if id, err := db.AddUserFood(ctx, &food1); err != nil {
		return err
	} else {
		food1.ID = id
	}

	err := db.AddUserFoods(context.Background(), []*TblUserFood{

		{UserID: user.ID, Name: "english muffin - wonder", Portion: 57, Unit: "g", Protein: 5, Carb: 25, Fibre: 1, Fat: 1.5},
		{UserID: user.ID, Name: "spaghettini - great value", Portion: 85, Unit: "g", Protein: 12, Carb: 63, Fibre: 3, Fat: 1},
		{UserID: user.ID, Name: "egg - medium", Portion: 1, Unit: "egg", Protein: 5.5, Carb: 0.5, Fibre: 0, Fat: 4.5},
		{UserID: user.ID, Name: "whey - ON Gold Standard - Natural Vanilla", Portion: 32, Unit: "g", Protein: 24, Carb: 5, Fibre: 0, Fat: 1},
		{UserID: user.ID, Name: "cassein - ON Gold Standard - Natural Chocolate", Portion: 38, Unit: "g", Protein: 24, Carb: 8, Fibre: 1, Fat: 1.5},
		{UserID: user.ID, Name: "silk - oat yeah", Portion: 250, Unit: "ml", Protein: 1, Carb: 6, Fibre: 1, Fat: 2.5},
		{UserID: user.ID, Name: "oatmeal - quaker - large flake", Portion: 30, Unit: "g", Protein: 4, Carb: 20, Fibre: 3, Fat: 2},
		{UserID: user.ID, Name: "blueberries - frozen", Portion: 80, Unit: "g", Protein: 0.5, Carb: 10, Fibre: 2, Fat: 0},
		{UserID: user.ID, Name: "rice - jasmine", Portion: 50, Unit: "g", Protein: 4, Carb: 38, Fibre: 2, Fat: 0},
		{UserID: user.ID, Name: "sugar cube", Portion: 1, Unit: "cube", Protein: 0, Carb: 4, Fibre: 0, Fat: 0},
		{UserID: user.ID, Name: "fudge bar", Portion: 1, Unit: "bar", Protein: 2, Carb: 18, Fibre: 1, Fat: 2},
		{UserID: user.ID, Name: "float bar", Portion: 1, Unit: "bar", Protein: 0.2, Carb: 10, Fibre: 0, Fat: 2},
		{UserID: user.ID, Name: "english muffin - no name", Portion: 57, Unit: "g", Protein: 5, Carb: 26, Fibre: 1, Fat: 1},
		{UserID: user.ID, Name: "grapes", Portion: 100, Unit: "g", Protein: 0.72, Carb: 18.1, Fibre: 0.9, Fat: 0.16},
	})

	if err != nil {
		return err
	}

	return err
}
